import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base

class Card(Base):
    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sentence_template = Column(String, nullable=False)
    target_word = Column(String, nullable=False)
    hint = Column(String)
    audio_url = Column(String)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    review_logs = relationship("ReviewLog", back_populates="card")
    users = relationship("UserCardAssociation", back_populates="card")
