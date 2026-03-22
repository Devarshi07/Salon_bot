import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    whatsapp_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="customer", lazy="select")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="customer", lazy="select")


from app.models.conversation import Conversation  # noqa: E402
from app.models.booking import Booking  # noqa: E402
