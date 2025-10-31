import uuid
from sqlalchemy import Column, Boolean, Integer, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base

class ReviewLog(Base):
    __tablename__ = "review_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id"), nullable=False, index=True)

    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, nullable=False)

    reviewed_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="review_logs")
    card = relationship("Card", back_populates="review_logs")
