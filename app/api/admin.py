import uuid
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.schemas.salon import (
    SalonCreate, SalonUpdate, SalonResponse,
    ServiceCreate, ServiceUpdate, ServiceResponse,
    PolicyCreate, PolicyUpdate, PolicyResponse,
    FAQCreate, FAQUpdate, FAQResponse,
    StaffCreate, StaffUpdate, StaffResponse,
)
from app.schemas.booking import BookingResponse
from app.services import salon_service, booking_service
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin")
settings = get_settings()


def require_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ===== Salons =====

@router.post("/salons", response_model=SalonResponse, dependencies=[Depends(require_api_key)])
async def create_salon(data: SalonCreate, db: AsyncSession = Depends(get_db)):
    return await salon_service.create_salon(db, data)


@router.get("/salons", response_model=list[SalonResponse], dependencies=[Depends(require_api_key)])
async def list_salons(db: AsyncSession = Depends(get_db)):
    return await salon_service.list_salons(db)


@router.get("/salons/{salon_id}", response_model=SalonResponse, dependencies=[Depends(require_api_key)])
async def get_salon(salon_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    salon = await salon_service.get_salon_by_id(db, salon_id)
    if salon is None:
        raise HTTPException(status_code=404, detail="Salon not found")
    return salon


@router.put("/salons/{salon_id}", response_model=SalonResponse, dependencies=[Depends(require_api_key)])
async def update_salon(salon_id: uuid.UUID, data: SalonUpdate, db: AsyncSession = Depends(get_db)):
    salon = await salon_service.get_salon_by_id(db, salon_id)
    if salon is None:
        raise HTTPException(status_code=404, detail="Salon not found")
    return await salon_service.update_salon(db, salon, data)


@router.delete("/salons/{salon_id}", dependencies=[Depends(require_api_key)])
async def deactivate_salon(salon_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    salon = await salon_service.get_salon_by_id(db, salon_id)
    if salon is None:
        raise HTTPException(status_code=404, detail="Salon not found")
    await salon_service.deactivate_salon(db, salon)
    return {"message": "Salon deactivated"}


@router.post("/salons/{salon_id}/generate-owner-token", dependencies=[Depends(require_api_key)])
async def generate_owner_token(salon_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Generate (or regenerate) a unique owner access token for the salon owner portal."""
    from app.models.salon import Salon
    result = await db.execute(select(Salon).where(Salon.id == salon_id))
    salon = result.scalar_one_or_none()
    if salon is None:
        raise HTTPException(status_code=404, detail="Salon not found")
    token = secrets.token_urlsafe(32)
    salon.owner_access_token = token
    await db.commit()
    return {"owner_access_token": token, "portal_url": f"/owner-login?token={token}"}


# ===== Services =====

@router.get("/salons/{salon_id}/services", response_model=list[ServiceResponse], dependencies=[Depends(require_api_key)])
async def list_services(salon_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await salon_service.list_services(db, salon_id)


@router.post("/salons/{salon_id}/services", response_model=ServiceResponse, dependencies=[Depends(require_api_key)])
async def create_service(salon_id: uuid.UUID, data: ServiceCreate, db: AsyncSession = Depends(get_db)):
    return await salon_service.create_service(db, salon_id, data)


@router.put("/salons/{salon_id}/services/{service_id}", response_model=ServiceResponse, dependencies=[Depends(require_api_key)])
async def update_service(
    salon_id: uuid.UUID, service_id: uuid.UUID, data: ServiceUpdate, db: AsyncSession = Depends(get_db)
):
    svc = await salon_service.update_service(db, salon_id, service_id, data)
    if svc is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc


@router.delete("/salons/{salon_id}/services/{service_id}", dependencies=[Depends(require_api_key)])
async def delete_service(salon_id: uuid.UUID, service_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await salon_service.delete_service(db, salon_id, service_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service removed"}


# ===== Policies =====

@router.post("/salons/{salon_id}/policies", response_model=PolicyResponse, dependencies=[Depends(require_api_key)])
async def create_policy(salon_id: uuid.UUID, data: PolicyCreate, db: AsyncSession = Depends(get_db)):
    return await salon_service.create_policy(db, salon_id, data)


@router.put("/salons/{salon_id}/policies/{policy_id}", response_model=PolicyResponse, dependencies=[Depends(require_api_key)])
async def update_policy(
    salon_id: uuid.UUID, policy_id: uuid.UUID, data: PolicyUpdate, db: AsyncSession = Depends(get_db)
):
    policy = await salon_service.update_policy(db, salon_id, policy_id, data)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.delete("/salons/{salon_id}/policies/{policy_id}", dependencies=[Depends(require_api_key)])
async def delete_policy(salon_id: uuid.UUID, policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await salon_service.delete_policy(db, salon_id, policy_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {"message": "Policy removed"}


# ===== FAQs =====

@router.post("/salons/{salon_id}/faqs", response_model=FAQResponse, dependencies=[Depends(require_api_key)])
async def create_faq(salon_id: uuid.UUID, data: FAQCreate, db: AsyncSession = Depends(get_db)):
    return await salon_service.create_faq(db, salon_id, data)


@router.put("/salons/{salon_id}/faqs/{faq_id}", response_model=FAQResponse, dependencies=[Depends(require_api_key)])
async def update_faq(
    salon_id: uuid.UUID, faq_id: uuid.UUID, data: FAQUpdate, db: AsyncSession = Depends(get_db)
):
    faq = await salon_service.update_faq(db, salon_id, faq_id, data)
    if faq is None:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return faq


@router.delete("/salons/{salon_id}/faqs/{faq_id}", dependencies=[Depends(require_api_key)])
async def delete_faq(salon_id: uuid.UUID, faq_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await salon_service.delete_faq(db, salon_id, faq_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {"message": "FAQ removed"}


# ===== Staff =====

@router.post("/salons/{salon_id}/staff", response_model=StaffResponse, dependencies=[Depends(require_api_key)])
async def create_staff(salon_id: uuid.UUID, data: StaffCreate, db: AsyncSession = Depends(get_db)):
    return await salon_service.create_staff(db, salon_id, data)


@router.put("/salons/{salon_id}/staff/{staff_id}", response_model=StaffResponse, dependencies=[Depends(require_api_key)])
async def update_staff(
    salon_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate, db: AsyncSession = Depends(get_db)
):
    member = await salon_service.update_staff(db, salon_id, staff_id, data)
    if member is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return member


@router.delete("/salons/{salon_id}/staff/{staff_id}", dependencies=[Depends(require_api_key)])
async def delete_staff(salon_id: uuid.UUID, staff_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await salon_service.delete_staff(db, salon_id, staff_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"message": "Staff member removed"}


# ===== Bookings =====

@router.get("/salons/{salon_id}/bookings", response_model=list[BookingResponse], dependencies=[Depends(require_api_key)])
async def list_bookings(
    salon_id: uuid.UUID,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await booking_service.list_salon_bookings(db, salon_id, date_from, date_to)


@router.get("/salons/{salon_id}/bookings/{booking_id}", response_model=BookingResponse, dependencies=[Depends(require_api_key)])
async def get_booking(salon_id: uuid.UUID, booking_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    booking = await booking_service.get_booking_by_id(db, booking_id)
    if booking is None or booking.salon_id != salon_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


# ===== Conversations =====

@router.get("/salons/{salon_id}/conversations", dependencies=[Depends(require_api_key)])
async def list_conversations(salon_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from app.models.conversation import Conversation
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Conversation)
        .where(Conversation.salon_id == salon_id)
        .options(selectinload(Conversation.customer))
        .order_by(Conversation.updated_at.desc())
        .limit(50)
    )
    convs = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "customer_number": c.customer.whatsapp_number,
            "customer_name": c.customer.name,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in convs
    ]


@router.get("/salons/{salon_id}/conversations/{conv_id}/messages", dependencies=[Depends(require_api_key)])
async def get_conversation_messages(
    salon_id: uuid.UUID, conv_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models.conversation import Conversation, Message
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id, Conversation.salon_id == salon_id
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = await conversation_service.get_conversation_history(db, conv_id)
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]
