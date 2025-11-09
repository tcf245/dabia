from unittest.mock import MagicMock
import uuid
from types import SimpleNamespace

from dabia.api.v1.session import get_next_card
from dabia.schemas import PreviousAnswer

def test_get_next_card_no_answer_ut():
    """Unit test for getting a card when no previous answer is provided."""
    # Arrange
    mock_db = MagicMock()
    user_id = uuid.uuid4()

    # Mock the DB model object that the query returns
    mock_card_db_obj = SimpleNamespace(
        id=uuid.uuid4(),
        deck=SimpleNamespace(id=uuid.uuid4(), name="Test Deck"),
        sentence_template="Hello __",
        target_word="World",
        hint="A greeting",
        audio_url="/audio.mp3",
        sentence=None,
        sentence_furigana=None,
        sentence_translation=None,
        sentence_audio_url=None,
        users=[]
    )
    mock_db.query.return_value.options.return_value.order_by.return_value.first.return_value = mock_card_db_obj

    # Act
    response = get_next_card(answer=None, db=mock_db, current_user_id=user_id)

    # Assert
    assert response.card.sentence_template == "Hello __"
    assert response.card.target.word == "World"
    mock_db.commit.assert_not_called()

def test_get_next_card_with_answer_ut():
    """Unit test for saving a previous answer."""
    # Arrange
    mock_db = MagicMock()
    user_id = uuid.uuid4()
    # Adjust mock for the .order_by() call
    mock_db.query.return_value.options.return_value.order_by.return_value.first.return_value = None  # No next card

    answer = PreviousAnswer(
        card_id=uuid.uuid4(),
        is_correct=False,
        response_time_ms=5000
    )

    # Act
    response = get_next_card(answer=answer, db=mock_db, current_user_id=user_id)

    # Assert
    assert response.card is None
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

    added_object = mock_db.add.call_args[0][0]
    assert added_object.card_id == answer.card_id
    assert added_object.is_correct is False
    assert added_object.user_id == user_id
