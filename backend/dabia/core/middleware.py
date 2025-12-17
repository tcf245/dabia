from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
import uuid
from dabia.core.logging import logger, trace_id_ctx, user_id_ctx

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # 1. Generate and set Trace ID
        trace_id = str(uuid.uuid4())
        trace_token = trace_id_ctx.set(trace_id)
        
        # Reset User ID to anonymous for new request scope
        user_token = user_id_ctx.set("anonymous")
        
        # 2. Log Request Start
        # We try to get client host, but in prod behind proxy it might be forwarded.
        client_host = request.client.host if request.client else "unknown"
        
        logger.info(
            f"[START] Method: {request.method} Path: {request.url.path} "
            f"Client: {client_host} Query: {request.query_params}"
        )
        
        try:
            response = await call_next(request)
            
            # 3. Log Response (Success/Error handled by app, but middleware sees status)
            process_time = (time.time() - start_time) * 1000
            
            logger.info(
                f"[END] Status: {response.status_code} "
                f"Cost: {process_time:.2f}ms"
            )
            
            return response
            
        except Exception as e:
            # Fallback for unhandled exceptions (though app exception handlers usually catch them)
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"[ERROR] Unhandled Exception: {str(e)} "
                f"Cost: {process_time:.2f}ms",
                exc_info=True
            )
            raise e
        finally:
            # Reset context vars
            trace_id_ctx.reset(trace_token)
            user_id_ctx.reset(user_token)
