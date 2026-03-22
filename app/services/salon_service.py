import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.salon import Salon, SalonService, SalonPolicy, SalonFAQ, SalonStaff
from app.schemas.salon import (
    SalonCreate, SalonUpdate,
    ServiceCreate, ServiceUpdate,
    PolicyCreate, PolicyUpdate,
    FAQCreate, FAQUpdate,
    StaffCreate, StaffUpdate,
)
from app.services.encryption import encrypt_token
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ---------- Salon CRUD ----------

async def get_salon_by_phone_number_id(db: AsyncSession, phone_number_id: str) -> Salon | None:
    result = await db.execute(
        select(Salon)
        .where(Salon.whatsapp_phone_number_id == phone_number_id, Salon.is_active == True)
        .options(
            selectinload(Salon.services),
            selectinload(Salon.policies),
            selectinload(Salon.faqs),
            selectinload(Salon.staff),
        )
    )
    return result.scalar_one_or_none()


async def get_salon_by_id(db: AsyncSession, salon_id: uuid.UUID) -> Salon | None:
    result = await db.execute(
        select(Salon)
        .where(Salon.id == salon_id)
        .options(
            selectinload(Salon.services),
            selectinload(Salon.policies),
            selectinload(Salon.faqs),
            selectinload(Salon.staff),
        )
    )
    return result.scalar_one_or_none()


async def list_salons(db: AsyncSession) -> list[Salon]:
    result = await db.execute(select(Salon))
    return list(result.scalars().all())


async def create_salon(db: AsyncSession, data: SalonCreate) -> Salon:
    encrypted_token = encrypt_token(data.whatsapp_access_token)
    salon = Salon(
        name=data.name,
        phone_number=data.phone_number,
        whatsapp_phone_number_id=data.whatsapp_phone_number_id,
        whatsapp_access_token_encrypted=encrypted_token,
        address=data.address,
        business_hours=data.business_hours,
        timezone=data.timezone,
        bot_system_prompt=data.bot_system_prompt,
        google_calendar_id=data.google_calendar_id,
        additional_info=data.additional_info,
    )
    db.add(salon)
    await db.commit()
    await db.refresh(salon)
    return salon


async def update_salon(db: AsyncSession, salon: Salon, data: SalonUpdate) -> Salon:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(salon, field, value)
    await db.commit()
    await db.refresh(salon)
    return salon


async def deactivate_salon(db: AsyncSession, salon: Salon) -> Salon:
    salon.is_active = False
    await db.commit()
    await db.refresh(salon)
    return salon


# ---------- Service CRUD ----------

async def list_services(db: AsyncSession, salon_id: uuid.UUID) -> list[SalonService]:
    result = await db.execute(
        select(SalonService).where(SalonService.salon_id == salon_id)
    )
    return list(result.scalars().all())


async def create_service(db: AsyncSession, salon_id: uuid.UUID, data: ServiceCreate) -> SalonService:
    svc = SalonService(salon_id=salon_id, **data.model_dump())
    db.add(svc)
    await db.commit()
    await db.refresh(svc)
    return svc


async def update_service(
    db: AsyncSession, salon_id: uuid.UUID, service_id: uuid.UUID, data: ServiceUpdate
) -> SalonService | None:
    result = await db.execute(
        select(SalonService).where(
            SalonService.salon_id == salon_id, SalonService.id == service_id
        )
    )
    svc = result.scalar_one_or_none()
    if svc is None:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(svc, field, value)
    await db.commit()
    await db.refresh(svc)
    return svc


async def delete_service(db: AsyncSession, salon_id: uuid.UUID, service_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SalonService).where(
            SalonService.salon_id == salon_id, SalonService.id == service_id
        )
    )
    svc = result.scalar_one_or_none()
    if svc is None:
        return False
    svc.is_active = False
    await db.commit()
    return True


# ---------- Policy CRUD ----------

async def list_policies(db: AsyncSession, salon_id: uuid.UUID) -> list[SalonPolicy]:
    result = await db.execute(
        select(SalonPolicy).where(SalonPolicy.salon_id == salon_id)
    )
    return list(result.scalars().all())


async def create_policy(db: AsyncSession, salon_id: uuid.UUID, data: PolicyCreate) -> SalonPolicy:
    policy = SalonPolicy(salon_id=salon_id, **data.model_dump())
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


async def update_policy(
    db: AsyncSession, salon_id: uuid.UUID, policy_id: uuid.UUID, data: PolicyUpdate
) -> SalonPolicy | None:
    result = await db.execute(
        select(SalonPolicy).where(
            SalonPolicy.salon_id == salon_id, SalonPolicy.id == policy_id
        )
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
    await db.commit()
    await db.refresh(policy)
    return policy


async def delete_policy(db: AsyncSession, salon_id: uuid.UUID, policy_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SalonPolicy).where(
            SalonPolicy.salon_id == salon_id, SalonPolicy.id == policy_id
        )
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        return False
    await db.delete(policy)
    await db.commit()
    return True


# ---------- FAQ CRUD ----------

async def list_faqs(db: AsyncSession, salon_id: uuid.UUID) -> list[SalonFAQ]:
    result = await db.execute(
        select(SalonFAQ).where(SalonFAQ.salon_id == salon_id)
    )
    return list(result.scalars().all())


async def create_faq(db: AsyncSession, salon_id: uuid.UUID, data: FAQCreate) -> SalonFAQ:
    faq = SalonFAQ(salon_id=salon_id, **data.model_dump())
    db.add(faq)
    await db.commit()
    await db.refresh(faq)
    return faq


async def update_faq(
    db: AsyncSession, salon_id: uuid.UUID, faq_id: uuid.UUID, data: FAQUpdate
) -> SalonFAQ | None:
    result = await db.execute(
        select(SalonFAQ).where(
            SalonFAQ.salon_id == salon_id, SalonFAQ.id == faq_id
        )
    )
    faq = result.scalar_one_or_none()
    if faq is None:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(faq, field, value)
    await db.commit()
    await db.refresh(faq)
    return faq


async def delete_faq(db: AsyncSession, salon_id: uuid.UUID, faq_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SalonFAQ).where(
            SalonFAQ.salon_id == salon_id, SalonFAQ.id == faq_id
        )
    )
    faq = result.scalar_one_or_none()
    if faq is None:
        return False
    await db.delete(faq)
    await db.commit()
    return True


# ---------- Staff CRUD ----------

async def list_staff(db: AsyncSession, salon_id: uuid.UUID) -> list[SalonStaff]:
    result = await db.execute(
        select(SalonStaff).where(SalonStaff.salon_id == salon_id)
    )
    return list(result.scalars().all())


async def create_staff(db: AsyncSession, salon_id: uuid.UUID, data: StaffCreate) -> SalonStaff:
    member = SalonStaff(salon_id=salon_id, **data.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def update_staff(
    db: AsyncSession, salon_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate
) -> SalonStaff | None:
    result = await db.execute(
        select(SalonStaff).where(
            SalonStaff.salon_id == salon_id, SalonStaff.id == staff_id
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(member, field, value)
    await db.commit()
    await db.refresh(member)
    return member


async def delete_staff(db: AsyncSession, salon_id: uuid.UUID, staff_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(SalonStaff).where(
            SalonStaff.salon_id == salon_id, SalonStaff.id == staff_id
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        return False
    member.is_active = False
    await db.commit()
    return True
