import pytest
from fastapi import HTTPException
from dabia.api.deps import get_current_user_id
from unittest.mock import MagicMock
from jose import jwt
from dabia.core.config import settings
from dabia.api.v1.auth import ALGORITHM
import uuid

@pytest.mark.asyncio
async def test_get_current_user_id_invalid_token_raises_401():
    mock_db = MagicMock()
    # Provide a token that will fail decoding (e.g. wrong secret or expired)
    invalid_token = "invalid.token.here"
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user_id(token=invalid_token, db=mock_db)
    
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Could not validate credentials"

@pytest.mark.asyncio
async def test_get_current_user_id_no_token_returns_guest():
    mock_db = MagicMock()
    default_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    result = await get_current_user_id(token=None, db=mock_db)
    
    assert result == default_user_id

@pytest.mark.asyncio
async def test_get_current_user_id_expired_token_raises_401():
    mock_db = MagicMock()
    # Create an expired token
    payload = {"sub": str(uuid.uuid4()), "exp": 1} # Expired long ago
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user_id(token=expired_token, db=mock_db)
    
    assert excinfo.value.status_code == 401
