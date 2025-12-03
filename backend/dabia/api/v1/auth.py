from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
from datetime import datetime, timedelta, timezone
from jose import jwt
from typing import Optional

from dabia.database import get_db
from dabia.models.user import User
from dabia.core.config import settings

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

class Token(BaseModel):
    access_token: str
    token_type: str

# TODO: Move to settings
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login/google", response_model=Token)
def login_google(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # Verify the token
        # Try verifying as ID Token first
        try:
            id_info = id_token.verify_oauth2_token(
                request.token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            # If ID Token verification fails, try as Access Token
            # 1. Verify token info (audience)
            token_info_resp = requests.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={request.token}"
            )
            if token_info_resp.status_code != 200:
                raise ValueError("Invalid token")
            
            token_info = token_info_resp.json()
            # Verify audience matches our client ID
            # Note: For some access tokens, 'aud' might be the client_id
            if token_info.get("aud") != settings.GOOGLE_CLIENT_ID:
                raise ValueError("Invalid token audience")

            # 2. Get User Info
            user_info_resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {request.token}"},
            )
            if user_info_resp.status_code != 200:
                raise ValueError("Failed to fetch user info")
            
            id_info = user_info_resp.json()

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ID token or Access Token is valid. Get the user's Google Account ID from the decoded token.
    google_id = id_info['sub']
    email = id_info['email']
    name = id_info.get('name')
    picture = id_info.get('picture')

    # Check if user exists
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create new user
        user = User(
            email=email,
            google_id=google_id,
            full_name=name,
            avatar_url=picture,
            hashed_password=None # No password for Google users
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update existing user info
        if not user.google_id:
            user.google_id = google_id
        
        # Update profile info if changed
        if name and user.full_name != name:
            user.full_name = name
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            
        db.commit()
        db.refresh(user)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "picture": user.avatar_url
        },
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
