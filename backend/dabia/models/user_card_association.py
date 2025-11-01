from sqlalchemy import Column, Integer, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from dabia.models.base import Base

class UserCardAssociation(Base):
    __tablename__ = "user_card_associations"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id"), primary_key=True)

    proficiency_level = Column(Integer, default=0, nullable=False)
    next_review_at = Column(DateTime, default=func.now(), nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="cards")
    card = relationship("Card", back_populates="users")
