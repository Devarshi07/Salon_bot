import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.booking import Booking, BookingStatus
from app.models.salon import SalonService
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def create_booking(
    db: AsyncSession,
    salon_id: uuid.UUID,
    customer_id: uuid.UUID,
    service_id: uuid.UUID,
    appointment_datetime: datetime,
    duration_minutes: int,
    staff_id: uuid.UUID | None = None,
    google_calendar_event_id: str | None = None,
    notes: str | None = None,
) -> Booking:
    booking = Booking(
        salon_id=salon_id,
        customer_id=customer_id,
        service_id=service_id,
        staff_id=staff_id,
        appointment_datetime=appointment_datetime,
        duration_minutes=duration_minutes,
        status=BookingStatus.confirmed,
        google_calendar_event_id=google_calendar_event_id,
        notes=notes,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    logger.info("Booking created | id=%s", booking.id)
    return booking


async def cancel_booking(
    db: AsyncSession, booking_id: uuid.UUID
) -> Booking | None:
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        return None
    booking.status = BookingStatus.cancelled
    await db.commit()
    await db.refresh(booking)
    return booking


async def get_customer_upcoming_bookings(
    db: AsyncSession, customer_id: uuid.UUID, salon_id: uuid.UUID
) -> list[Booking]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Booking)
        .where(
            Booking.customer_id == customer_id,
            Booking.salon_id == salon_id,
            Booking.status == BookingStatus.confirmed,
            Booking.appointment_datetime >= now,
        )
        .options(selectinload(Booking.service))
        .order_by(Booking.appointment_datetime)
    )
    return list(result.scalars().all())


async def get_booking_by_id(db: AsyncSession, booking_id: uuid.UUID) -> Booking | None:
    result = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.service), selectinload(Booking.customer))
    )
    return result.scalar_one_or_none()


async def list_salon_bookings(
    db: AsyncSession,
    salon_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[Booking]:
    q = select(Booking).where(Booking.salon_id == salon_id).options(
        selectinload(Booking.service), selectinload(Booking.customer)
    )
    if date_from:
        q = q.where(Booking.appointment_datetime >= date_from)
    if date_to:
        q = q.where(Booking.appointment_datetime <= date_to)
    q = q.order_by(Booking.appointment_datetime)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_service_by_name(
    db: AsyncSession, salon_id: uuid.UUID, name: str
) -> SalonService | None:
    result = await db.execute(
        select(SalonService).where(
            SalonService.salon_id == salon_id,
            SalonService.is_active == True,
            SalonService.name.ilike(f"%{name}%"),
        )
    )
    return result.scalars().first()
