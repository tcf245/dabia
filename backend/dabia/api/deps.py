from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid
from dabia.core.config import settings
from dabia.api.v1.auth import ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    default_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    if not token:
        return default_user_id
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return default_user_id
        return uuid.UUID(user_id)
    except JWTError:
        # If token is invalid, we could raise 401, but for "Demo Mode" fallback,
        # maybe we just return the default user?
        # However, if the client *tried* to send a token and it's bad, it might be better to fail
        # so they know they aren't logged in.
        # But the user request says "if user submits card... just use default user id".
        # So let's fallback to default_user_id on error to be safe and non-blocking.
        return default_user_id
