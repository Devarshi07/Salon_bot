import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


# --- Salon ---

class SalonCreate(BaseModel):
    name: str
    phone_number: str
    whatsapp_phone_number_id: str
    whatsapp_access_token: str  # plaintext — will be encrypted before storage
    address: str | None = None
    business_hours: dict[str, Any]
    timezone: str = "America/New_York"
    bot_system_prompt: str | None = None
    google_calendar_id: str | None = None
    additional_info: str | None = None
    owner_whatsapp_number: str | None = None
    notify_on_booking: bool = True


class SalonUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None
    address: str | None = None
    business_hours: dict[str, Any] | None = None
    timezone: str | None = None
    bot_system_prompt: str | None = None
    google_calendar_id: str | None = None
    additional_info: str | None = None
    is_active: bool | None = None
    owner_whatsapp_number: str | None = None
    notify_on_booking: bool | None = None


class SalonResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone_number: str
    whatsapp_phone_number_id: str
    address: str | None
    business_hours: dict[str, Any]
    timezone: str
    bot_system_prompt: str | None
    google_calendar_id: str | None
    additional_info: str | None
    owner_whatsapp_number: str | None
    owner_access_token: str | None
    notify_on_booking: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Service ---

class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int
    price: float
    category: str | None = None


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    duration_minutes: int | None = None
    price: float | None = None
    category: str | None = None
    is_active: bool | None = None


class ServiceResponse(BaseModel):
    id: uuid.UUID
    salon_id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: float
    category: str | None
    is_active: bool

    class Config:
        from_attributes = True


# --- Policy ---

class PolicyCreate(BaseModel):
    title: str
    content: str
    category: str | None = None


class PolicyUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class PolicyResponse(BaseModel):
    id: uuid.UUID
    salon_id: uuid.UUID
    title: str
    content: str
    category: str | None

    class Config:
        from_attributes = True


# --- FAQ ---

class FAQCreate(BaseModel):
    question: str
    answer: str


class FAQUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None


class FAQResponse(BaseModel):
    id: uuid.UUID
    salon_id: uuid.UUID
    question: str
    answer: str

    class Config:
        from_attributes = True


# --- Staff ---

class StaffCreate(BaseModel):
    name: str
    role: str
    specialties: str | None = None
    google_calendar_id: str | None = None


class StaffUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    specialties: str | None = None
    google_calendar_id: str | None = None
    is_active: bool | None = None


class StaffResponse(BaseModel):
    id: uuid.UUID
    salon_id: uuid.UUID
    name: str
    role: str
    specialties: str | None
    google_calendar_id: str | None
    is_active: bool

    class Config:
        from_attributes = True
