from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid
from dabia.core.config import settings
from dabia.api.v1.auth import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

from sqlalchemy.orm import Session
from dabia.database import get_db
from dabia.models.user import User

async def get_current_user_id(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> uuid.UUID:
    default_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    if not token:
        return default_user_id
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return default_user_id
            
        user_uuid = uuid.UUID(user_id_str)
        
        # Verify user exists in database
        # If user is not found (e.g. DB reset), raise 401 to force re-login
        if not db.get(User, user_uuid):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_uuid
    except JWTError:
        # If token is invalid, we could raise 401, but for "Demo Mode" fallback,
        # maybe we just return the default user?
        # However, if the client *tried* to send a token and it's bad, it might be better to fail
        # so they know they aren't logged in.
        # But the user request says "if user submits card... just use default user id".
        # So let's fallback to default_user_id on error to be safe and non-blocking.
        return default_user_id
