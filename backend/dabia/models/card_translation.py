import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base


class CardTranslation(Base):
    """Learner-language content of a card: the hint (meaning) and the sentence translation.

    The Japanese side of a card is the same for every learner; only these two fields depend on the learner's language.
    """

    __tablename__ = "card_translations"
    __table_args__ = (UniqueConstraint("card_id", "language", name="uq_card_translations_card_language"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(16), nullable=False)  # lowercase BCP 47 tag: en, ja, pt-br, zh-hant
    hint = Column(String)
    sentence_translation = Column(String)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    card = relationship("Card", back_populates="translations")
