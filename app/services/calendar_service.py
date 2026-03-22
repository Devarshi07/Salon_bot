import asyncio
import json
from datetime import datetime, timedelta, timezone, time
from typing import Any

from google.oauth2 import service_account
from googleapiclient.discovery import build
import pytz

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
SLOT_INTERVAL_MINUTES = 30


def _get_calendar_service():
    settings = get_settings()
    service_account_info = json.loads(settings.google_service_account_json)
    credentials = service_account.Credentials.from_service_account_info(
        service_account_info, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=credentials, cache_discovery=False)


def _get_day_hours(business_hours: dict, date: datetime) -> tuple[str, str] | None:
    """Return (open_time, close_time) for a given date, or None if closed."""
    day_name = date.strftime("%A").lower()
    day_config = business_hours.get(day_name)
    if not day_config:
        return None
    return day_config.get("open"), day_config.get("close")


def _parse_time(t: str) -> time:
    return datetime.strptime(t, "%H:%M").time()


def _get_busy_slots(service, calendar_id: str, date_start: datetime, date_end: datetime) -> list[dict]:
    """Fetch busy time blocks from Google Calendar."""
    body = {
        "timeMin": date_start.isoformat(),
        "timeMax": date_end.isoformat(),
        "items": [{"id": calendar_id}],
    }
    result = service.freebusy().query(body=body).execute()
    return result.get("calendars", {}).get(calendar_id, {}).get("busy", [])


def _check_availability_sync(
    calendar_id: str,
    date: datetime,
    service_duration_minutes: int,
    business_hours: dict,
    tz: str,
) -> list[str]:
    local_tz = pytz.timezone(tz)
    local_date = date.astimezone(local_tz).date()

    hours = _get_day_hours(business_hours, date.astimezone(local_tz))
    if not hours or not hours[0] or not hours[1]:
        return []

    open_time = _parse_time(hours[0])
    close_time = _parse_time(hours[1])

    # Build candidate slots
    slots = []
    current = datetime.combine(local_date, open_time, tzinfo=local_tz)
    close = datetime.combine(local_date, close_time, tzinfo=local_tz)

    while current + timedelta(minutes=service_duration_minutes) <= close:
        slots.append(current)
        current += timedelta(minutes=SLOT_INTERVAL_MINUTES)

    if not slots:
        return []

    # Fetch busy from calendar
    day_start = datetime.combine(local_date, open_time, tzinfo=local_tz)
    day_end = datetime.combine(local_date, close_time, tzinfo=local_tz)

    try:
        service = _get_calendar_service()
        busy = _get_busy_slots(
            service,
            calendar_id,
            day_start.astimezone(pytz.utc),
            day_end.astimezone(pytz.utc),
        )
    except Exception as e:
        logger.error("Google Calendar API error: %s", e)
        raise

    # Filter out overlapping slots
    available = []
    for slot in slots:
        slot_end = slot + timedelta(minutes=service_duration_minutes)
        overlaps = False
        for busy_block in busy:
            busy_start = datetime.fromisoformat(busy_block["start"]).astimezone(local_tz)
            busy_end = datetime.fromisoformat(busy_block["end"]).astimezone(local_tz)
            if slot < busy_end and slot_end > busy_start:
                overlaps = True
                break
        if not overlaps:
            available.append(slot.strftime("%I:%M %p"))

    return available


def _create_event_sync(
    calendar_id: str,
    summary: str,
    start_dt: datetime,
    end_dt: datetime,
    description: str = "",
) -> str:
    service = _get_calendar_service()
    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
    }
    created = service.events().insert(calendarId=calendar_id, body=event).execute()
    return created["id"]


def _delete_event_sync(calendar_id: str, event_id: str) -> None:
    service = _get_calendar_service()
    service.events().delete(calendarId=calendar_id, eventId=event_id).execute()


async def get_available_slots(
    calendar_id: str,
    date: datetime,
    service_duration_minutes: int,
    business_hours: dict,
    tz: str,
) -> list[str]:
    return await asyncio.to_thread(
        _check_availability_sync,
        calendar_id,
        date,
        service_duration_minutes,
        business_hours,
        tz,
    )


async def create_calendar_event(
    calendar_id: str,
    summary: str,
    start_dt: datetime,
    end_dt: datetime,
    description: str = "",
) -> str:
    return await asyncio.to_thread(
        _create_event_sync, calendar_id, summary, start_dt, end_dt, description
    )


async def delete_calendar_event(calendar_id: str, event_id: str) -> None:
    await asyncio.to_thread(_delete_event_sync, calendar_id, event_id)
