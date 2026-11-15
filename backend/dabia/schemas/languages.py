from pydantic import BaseModel


class Language(BaseModel):
    code: str  # lowercase BCP 47 tag
    cards: int  # cards with content in this language


class LanguagesResponse(BaseModel):
    default: str
    languages: list[Language]
