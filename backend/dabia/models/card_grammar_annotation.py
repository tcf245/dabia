import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base


class CardGrammarAnnotation(Base):
    __tablename__ = "card_grammar_annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    grammar_point_id = Column(
        UUID(as_uuid=True), ForeignKey("grammar_points.id", ondelete="CASCADE"), nullable=False, index=True
    )
    surface_text = Column(String, nullable=False)
    start_index = Column(Integer, nullable=True)
    end_index = Column(Integer, nullable=True)
    role_label = Column(String, nullable=True)
    explanation_for_sentence = Column(Text, nullable=False)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    confidence = Column(Float, nullable=True)
    source = Column(String, nullable=False, default="manual", server_default="manual")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    card = relationship("Card", back_populates="grammar_annotations")
    grammar_point = relationship("GrammarPoint", back_populates="card_annotations")
