"""
Salon Owner Portal API — read-only access for individual salon owners.
Authentication: unique owner_access_token per salon (set via admin API).
"""
import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Any

from app.database import get_db
from app.models.salon import Salon
from app.models.booking import Booking, BookingStatus
from app.models.conversation import Conversation, Message
from app.models.customer import Customer
from app.services import salon_service, booking_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/owner")


# ---------- Auth ----------

async def get_owner_salon(
    x_owner_token: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> Salon:
    result = await db.execute(
        select(Salon).where(Salon.owner_access_token == x_owner_token, Salon.is_active == True)
    )
    salon = result.scalar_one_or_none()
    if salon is None:
        raise HTTPException(status_code=401, detail="Invalid owner token")
    return salon


# ---------- Schemas ----------

class OwnerSalonResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone_number: str
    address: str | None
    timezone: str
    business_hours: dict[str, Any]
    google_calendar_id: str | None
    notify_on_booking: bool
    owner_whatsapp_number: str | None

    class Config:
        from_attributes = True


class OwnerBookingResponse(BaseModel):
    id: uuid.UUID
    appointment_datetime: datetime
    duration_minutes: int
    status: BookingStatus
    notes: str | None
    customer_name: str | None
    customer_whatsapp: str
    service_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class StatsResponse(BaseModel):
    total_bookings: int
    upcoming_bookings: int
    cancelled_bookings: int
    total_customers: int
    total_conversations: int


# ---------- Endpoints ----------

@router.get("/me", response_model=OwnerSalonResponse)
async def get_my_salon(salon: Salon = Depends(get_owner_salon)):
    """Get the salon owner's own salon info."""
    return salon


@router.get("/bookings", response_model=list[OwnerBookingResponse])
async def get_my_bookings(
    status: str | None = None,
    salon: Salon = Depends(get_owner_salon),
    db: AsyncSession = Depends(get_db),
):
    """List all bookings for this salon."""
    query = (
        select(Booking)
        .where(Booking.salon_id == salon.id)
        .order_by(Booking.appointment_datetime.desc())
    )
    if status:
        try:
            query = query.where(Booking.status == BookingStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    result = await db.execute(query)
    bookings = result.scalars().all()

    out = []
    for b in bookings:
        customer_result = await db.execute(select(Customer).where(Customer.id == b.customer_id))
        customer = customer_result.scalar_one_or_none()
        from app.models.salon import SalonService
        svc_result = await db.execute(select(SalonService).where(SalonService.id == b.service_id))
        service = svc_result.scalar_one_or_none()
        out.append(OwnerBookingResponse(
            id=b.id,
            appointment_datetime=b.appointment_datetime,
            duration_minutes=b.duration_minutes,
            status=b.status,
            notes=b.notes,
            customer_name=customer.name if customer else None,
            customer_whatsapp=customer.whatsapp_number if customer else "Unknown",
            service_name=service.name if service else "Unknown",
            created_at=b.created_at,
        ))
    return out


@router.get("/stats", response_model=StatsResponse)
async def get_my_stats(
    salon: Salon = Depends(get_owner_salon),
    db: AsyncSession = Depends(get_db),
):
    """Get summary stats for this salon."""
    now = datetime.now(timezone.utc)

    total = await db.scalar(select(func.count()).where(Booking.salon_id == salon.id))
    upcoming = await db.scalar(
        select(func.count()).where(
            Booking.salon_id == salon.id,
            Booking.status == BookingStatus.confirmed,
            Booking.appointment_datetime >= now,
        )
    )
    cancelled = await db.scalar(
        select(func.count()).where(
            Booking.salon_id == salon.id,
            Booking.status == BookingStatus.cancelled,
        )
    )
    # Unique customers who have bookings at this salon
    customers = await db.scalar(
        select(func.count(Booking.customer_id.distinct())).where(Booking.salon_id == salon.id)
    )
    conversations = await db.scalar(
        select(func.count()).where(Conversation.salon_id == salon.id)
    )

    return StatsResponse(
        total_bookings=total or 0,
        upcoming_bookings=upcoming or 0,
        cancelled_bookings=cancelled or 0,
        total_customers=customers or 0,
        total_conversations=conversations or 0,
    )


@router.get("/conversations")
async def get_my_conversations(
    salon: Salon = Depends(get_owner_salon),
    db: AsyncSession = Depends(get_db),
):
    """List recent conversations for this salon."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.salon_id == salon.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
    )
    conversations = result.scalars().all()
    out = []
    for conv in conversations:
        customer_result = await db.execute(select(Customer).where(Customer.id == conv.customer_id))
        customer = customer_result.scalar_one_or_none()
        # Last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()
        out.append({
            "id": str(conv.id),
            "customer_name": customer.name if customer else None,
            "customer_whatsapp": customer.whatsapp_number if customer else "Unknown",
            "is_active": conv.is_active,
            "last_message": last_msg.content[:100] if last_msg else None,
            "last_message_role": last_msg.role if last_msg else None,
            "updated_at": conv.updated_at.isoformat(),
        })
    return out


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    salon: Salon = Depends(get_owner_salon),
    db: AsyncSession = Depends(get_db),
):
    """Read messages for a specific conversation (must belong to this salon)."""
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.salon_id == salon.id,
        )
    )
    conv = conv_result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]
