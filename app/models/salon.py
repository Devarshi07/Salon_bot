import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Text, Boolean, Float, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Salon(Base):
    __tablename__ = "salons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(50), nullable=False)
    whatsapp_phone_number_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    whatsapp_access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_hours: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="America/New_York")
    bot_system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_calendar_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    additional_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Salon owner portal fields
    owner_whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    owner_access_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True, index=True)
    notify_on_booking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    services: Mapped[List["SalonService"]] = relationship("SalonService", back_populates="salon", lazy="select")
    policies: Mapped[List["SalonPolicy"]] = relationship("SalonPolicy", back_populates="salon", lazy="select")
    faqs: Mapped[List["SalonFAQ"]] = relationship("SalonFAQ", back_populates="salon", lazy="select")
    staff: Mapped[List["SalonStaff"]] = relationship("SalonStaff", back_populates="salon", lazy="select")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="salon", lazy="select")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="salon", lazy="select")


class SalonService(Base):
    __tablename__ = "salon_services"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("salons.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    salon: Mapped["Salon"] = relationship("Salon", back_populates="services")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="service", lazy="select")


class SalonPolicy(Base):
    __tablename__ = "salon_policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("salons.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    salon: Mapped["Salon"] = relationship("Salon", back_populates="policies")


class SalonFAQ(Base):
    __tablename__ = "salon_faqs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("salons.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)

    salon: Mapped["Salon"] = relationship("Salon", back_populates="faqs")


class SalonStaff(Base):
    __tablename__ = "salon_staff"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("salons.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    specialties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_calendar_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    salon: Mapped["Salon"] = relationship("Salon", back_populates="staff")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="staff_member", lazy="select")


# avoid circular import
from app.models.conversation import Conversation  # noqa: E402
from app.models.booking import Booking  # noqa: E402
