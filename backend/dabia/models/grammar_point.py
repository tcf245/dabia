import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base


class GrammarPoint(Base):
    __tablename__ = "grammar_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    short_meaning = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True)
    jlpt_level = Column(String, nullable=True, index=True)
    formation = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    card_annotations = relationship("CardGrammarAnnotation", back_populates="grammar_point")
