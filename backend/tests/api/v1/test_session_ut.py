from unittest.mock import MagicMock, patch
import uuid
from types import SimpleNamespace

from dabia.api.v1.session import get_next_card
from dabia.schemas import PreviousAnswer
from dabia.models.card import Card
from dabia.models.deck import Deck
from dabia.models.user_card_association import UserCardAssociation

@patch("dabia.api.v1.session.Scheduler")
def test_get_next_card_no_answer_ut(MockScheduler):
    """Unit test for getting a card when no previous answer is provided."""
    # Arrange
    mock_db = MagicMock()
    user_id = uuid.uuid4()
    
    # Setup Mock Scheduler instance
    mock_scheduler_instance = MockScheduler.return_value
    
    # Create a proper Card object (or a Mock that behaves like one)
    # Using SimpleNamespace with proper types to satisfy Pydantic
    mock_card = MagicMock(spec=Card)
    mock_card.id = uuid.uuid4()
    mock_card.deck = MagicMock(spec=Deck)
    mock_card.deck.id = uuid.uuid4()
    mock_card.deck.name = "Test Deck"
    mock_card.sentence_template = "Hello __"
    mock_card.target_word = "World"
    mock_card.reading = "Sekai"
    mock_card.hint = "A greeting"
    mock_card.audio_url = "/audio.mp3"
    mock_card.sentence = None
    mock_card.sentence_furigana = None
    mock_card.sentence_translation = None
    mock_card.sentence_audio_url = None
    
    # Mock UserCardAssociation for proficiency level
    mock_assoc = MagicMock(spec=UserCardAssociation)
    mock_assoc.user_id = user_id
    mock_assoc.proficiency_level = 0
    mock_card.users = [mock_assoc]

    mock_scheduler_instance.get_next_card.return_value = (mock_card, None, {'type': 'new'})

    # Act
    response = get_next_card(answer=None, db=mock_db, current_user_id=user_id)

    # Assert
    assert response.card.sentence_template == "Hello __"
    assert response.card.target.word == "World"
    assert response.card.reading == "Sekai"
    # Verify Scheduler was called
    MockScheduler.assert_called_with(mock_db)
    mock_scheduler_instance.get_next_card.assert_called_with(user_id)

@patch("dabia.api.v1.session.Scheduler")
def test_get_next_card_with_answer_ut(MockScheduler):
    """Unit test for saving a previous answer."""
    # Arrange
    mock_db = MagicMock()
    user_id = uuid.uuid4()
    
    # Setup Mock Scheduler
    mock_scheduler_instance = MockScheduler.return_value
    mock_scheduler_instance.get_next_card.return_value = (None, None, {'type': 'done'})

    answer = PreviousAnswer(
        card_id=uuid.uuid4(),
        is_correct=False,
        response_time_ms=5000
    )

    # Act
    response = get_next_card(answer=answer, db=mock_db, current_user_id=user_id)

    # Assert
    assert response.card is None
    
    # Verify update_card_state was called
    mock_scheduler_instance.update_card_state.assert_called_once_with(
        user_id=user_id,
        card_id=answer.card_id,
        quality=2, # Default for is_correct=False
        response_time_ms=5000
    )
