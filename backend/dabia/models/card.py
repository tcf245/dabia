import uuid
from sqlalchemy import Column, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base

class Card(Base):
    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id"), nullable=False, index=True)

    sentence_template = Column(String, nullable=False)
    target_word = Column(String, nullable=False)
    reading = Column(String) # For pronunciation, e.g., hiragana or romaji
    hint = Column(String)
    audio_url = Column(String)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    deck = relationship("Deck", back_populates="cards")
    review_logs = relationship("ReviewLog", back_populates="card")
    users = relationship("UserCardAssociation", back_populates="card")
