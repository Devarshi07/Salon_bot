import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.booking import BookingStatus


class BookingResponse(BaseModel):
    id: uuid.UUID
    salon_id: uuid.UUID
    customer_id: uuid.UUID
    service_id: uuid.UUID
    staff_id: uuid.UUID | None
    appointment_datetime: datetime
    duration_minutes: int
    status: BookingStatus
    google_calendar_event_id: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
