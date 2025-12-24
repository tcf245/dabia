from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta
from dabia.core.config import settings
import time

class TokenRefreshMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 1. Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return response

        from dabia.api.v1.auth import ALGORITHM, create_access_token
        token = auth_header.split(" ")[1]
        
        try:
            # 2. Decode token (without validation first to get exp)
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            
            # 3. Check if it's "old enough" to refresh but still valid
            # If it's more than 1 day old, refresh it
            exp = payload.get("exp")
            if exp:
                # JWT exp is UTC timestamp
                current_time = datetime.now(timezone.utc).timestamp()
                
                # Check when it was issued (iat) or just use a fixed window
                # Here we refresh if it's within the last 6 days of its 7-day life
                # (i.e., if it was issued more than 24 hours ago)
                # For safety, let's look for 'iat'
                iat = payload.get("iat")
                
                should_refresh = False
                if iat:
                    age = current_time - iat
                    if age > (24 * 3600): # > 24 hours
                        should_refresh = True
                else:
                    # Fallback: if expiring in less than 6 days (meaning it was issued > 1 day ago for a 7 day token)
                    # 7 days = 604800s. 6 days = 518400s. 
                    remaining = exp - current_time
                    if remaining < (6 * 24 * 3600):
                        should_refresh = True

                if should_refresh:
                    # 4. Generate fresh token with same payload but new exp/iat
                    # We remove 'exp' and 'iat' so create_access_token adds fresh ones
                    new_data = payload.copy()
                    new_data.pop("exp", None)
                    new_data.pop("iat", None)
                    
                    # Refresh for 7 days
                    new_token = create_access_token(
                        data=new_data,
                        expires_delta=timedelta(days=7)
                    )
                    
                    # 5. Add to response headers
                    # We need to expose this header to CORS if applicable
                    response.headers["X-Refresh-Token"] = new_token
                    # Ensure frontend can read it
                    # Note: LoggingMiddleware or CORSMiddleware might already handle some headers
                    
        except JWTError:
            # If token is invalid/expired, deps.py will handle the 401
            # Middleware doesn't need to block
            pass
            
        return response
