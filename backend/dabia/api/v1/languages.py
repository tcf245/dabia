from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dabia.core.i18n import DEFAULT_LANGUAGE, available_languages
from dabia.database import get_db
from dabia.schemas.languages import Language, LanguagesResponse

router = APIRouter()


@router.get("", response_model=LanguagesResponse)
def list_languages(db: Session = Depends(get_db)) -> Any:
    """The learner languages cards can be served in, with how many cards each covers. Public: the signed-out welcome
    page builds its language menu from it, and a newly imported language shows up without a code change."""
    return LanguagesResponse(
        default=DEFAULT_LANGUAGE,
        languages=[Language(code=code, cards=cards) for code, cards in available_languages(db)],
    )
