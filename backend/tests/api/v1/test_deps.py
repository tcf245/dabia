import pytest
from fastapi import HTTPException
from dabia.api.deps import get_current_user_id
from unittest.mock import MagicMock
from jose import jwt
from dabia.core.config import settings
from dabia.core.security import decode_token
import uuid

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_get_current_user_id_invalid_token_raises_401():
    mock_db = MagicMock()
    # Provide a token that will fail decoding (e.g. wrong secret or expired)
    invalid_token = "invalid.token.here"
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user_id(token=invalid_token, db=mock_db)
    
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Could not validate credentials"

@pytest.mark.anyio
async def test_get_current_user_id_no_token_returns_guest():
    mock_db = MagicMock()
    default_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    result = await get_current_user_id(token=None, db=mock_db)
    
    assert result == default_user_id

@pytest.mark.anyio
async def test_get_current_user_id_expired_token_raises_401():
    mock_db = MagicMock()
    # Create an expired token
    payload = {"sub": str(uuid.uuid4()), "exp": 1} # Expired long ago
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user_id(token=expired_token, db=mock_db)
    
    assert excinfo.value.status_code == 401

@pytest.mark.anyio
async def test_get_current_user_id_valid_token(db_session):
    user_id = uuid.uuid4()
    # Mock user exists in DB
    from dabia.models.user import User
    user = User(id=user_id, email="auth@example.com")
    db_session.add(user)
    db_session.commit()
    
    payload = {"sub": str(user_id)}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    result = await get_current_user_id(token=token, db=db_session)
    assert result == user_id

@pytest.mark.anyio
async def test_get_current_user_id_user_not_found_raises_401(db_session):
    user_id = uuid.uuid4() # Random ID not in DB
    payload = {"sub": str(user_id)}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user_id(token=token, db=db_session)
    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "User not found"

def test_get_current_user_success(db_session):
    user_id = uuid.uuid4()
    from dabia.models.user import User
    user = User(id=user_id, email="object@example.com")
    db_session.add(user)
    db_session.commit()
    
    from dabia.api.deps import get_current_user
    result = get_current_user(user_id=user_id, db=db_session)
    assert result.id == user_id
    assert result.email == "object@example.com"

@pytest.mark.anyio
async def test_get_current_user_id_no_sub_raises_default(db_session):
    # Token with no sub field
    payload = {"some": "data"}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    result = await get_current_user_id(token=token, db=db_session)
    assert result == uuid.UUID("00000000-0000-0000-0000-000000000000")

def test_get_current_user_not_found_raises_404(db_session):
    user_id = uuid.uuid4()
    from dabia.api.deps import get_current_user
    with pytest.raises(HTTPException) as excinfo:
        get_current_user(user_id=user_id, db=db_session)
    assert excinfo.value.status_code == 404
