from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
import uuid
from dabia.core.config import settings
from dabia.core.security import decode_token
from dabia.core.logging import user_id_ctx

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
        user_id_ctx.set(str(default_user_id))
        from dabia.core.logging import logger
        logger.info(f"[AUTH] No Token - Using default user: {default_user_id}")
        return default_user_id
        
    try:
        payload = decode_token(token)
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
            
        # Update Context & Log
        user_id_ctx.set(str(user_uuid))
        from dabia.core.logging import logger
        logger.info(f"[AUTH] Authenticated User: {user_uuid}")
        
        return user_uuid
    except JWTError:
        # If a token was provided but is invalid/expired, raise 401
        # This signals the frontend to clear the local session and redirect to login
        from dabia.core.logging import logger
        logger.warning(f"[AUTH] Invalid/Expired Token - Raising 401")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
