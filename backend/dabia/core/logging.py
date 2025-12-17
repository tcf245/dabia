import logging
import contextvars
import uuid
import sys

# Context Variables
trace_id_ctx = contextvars.ContextVar("trace_id", default=None)
user_id_ctx = contextvars.ContextVar("user_id", default=None)

class ContextFilter(logging.Filter):
    """
    A logging filter/formatter helper that adds trace_id and user_id to log records.
    """
    def filter(self, record):
        record.trace_id = trace_id_ctx.get() or "no-trace"
        record.user_id = user_id_ctx.get() or "anonymous"
        return True

def setup_logging():
    """
    Configures the root logger to output structured logs with trace_id and user_id.
    """
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    
    # Create formatter
    # Format: [Time] [Level] [TraceID] [UserID] Message
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [tid:%(trace_id)s] [uid:%(user_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    
    # Remove existing handlers to avoid duplicates (e.g. uvicorn's default)
    # root_logger.handlers = [] # Warning: This might suppress uvicorn logs if not careful.
    # Instead, let's just configure our own logger or update uvicorn's if possible.
    # For simplicity in this app, we'll just add our filter to the root logger's handlers if they exist,
    # or add our own handler.
    
    if not root_logger.handlers:
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)
    else:
        # If handlers exist (uvicorn), update their formatter?
        # That's invasive. Let's strictly configure "dabia" logger.
        pass

    # Better approach: Configure "dabia" logger specifically
    logger = logging.getLogger("dabia")
    logger.setLevel(logging.INFO)
    logger.propagate = False # Don't double log to root
    
    # Remove old handlers
    if logger.hasHandlers():
        logger.handlers.clear()
        
    logger.addHandler(handler)
    logger.addFilter(ContextFilter())
    
    return logger

# Initialize one global logger instance for import
logger = setup_logging()
