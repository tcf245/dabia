from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
from datetime import datetime, timedelta, timezone
from jose import JWTError
from typing import Optional
from dabia.core.security import create_access_token

from dabia.database import get_db
from dabia.models.user import User
from dabia.core.config import settings

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    code: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Removed local constants - using dabia.core.config and security

# Removed local create_access_token - using dabia.core.security

@router.post("/login/google", response_model=Token)
def login_google(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": request.code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": "postmessage",  # Use 'postmessage' for auth-code flow from frontend
            "grant_type": "authorization_code",
        }
        
        response = requests.post(token_url, data=data)
        if response.status_code != 200:
            raise ValueError(f"Failed to exchange code: {response.text}")
            
        tokens = response.json()
        id_token_str = tokens.get("id_token")
        
        # Verify the ID token
        # This checks the signature locally using Google's public keys
        id_info = id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )

    except ValueError as e:
        print(f"Auth Error: {str(e)}") # Log error for debugging
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
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "picture": user.avatar_url
        }
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
