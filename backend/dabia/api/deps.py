import uuid

# This is a temporary dependency to simulate getting a user ID from an auth token.
# In a real app, this would be a sophisticated function that decodes a JWT.
async def get_current_user_id() -> uuid.UUID:
    # For now, we return a hardcoded UUID.
    # This allows us to easily override it in tests.
    return uuid.UUID("00000000-0000-0000-0000-000000000000")
