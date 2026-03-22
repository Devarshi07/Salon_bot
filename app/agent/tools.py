"""
Agent tools — created with salon context pre-bound (Approach A from spec).
The LLM only provides customer-facing parameters; internal IDs are injected.
"""
import uuid
from datetime import datetime, timedelta
from typing import Any

import pytz
from langchain_core.tools import tool

from app.services import calendar_service, booking_service
from app.services.whatsapp import send_text_message
from app.utils.logger import get_logger

logger = get_logger(__name__)


def make_tools(
    salon_id: uuid.UUID,
    google_calendar_id: str,
    business_hours: dict,
    timezone: str,
    db_session_factory,
    customer_id: uuid.UUID,
    salon_context: dict = None,  # {owner_whatsapp_number, notify_on_booking, phone_number_id, access_token, salon_name}
):
    """
    Returns a list of LangChain tools with salon context pre-bound.
    db_session_factory: a callable that returns an async context manager yielding an AsyncSession.
    """

    @tool
    async def check_availability(date_str: str, service_name: str, service_duration_minutes: int = 60) -> str:
        """
        Check available appointment slots for a given date and service.
        date_str: date in YYYY-MM-DD format.
        service_name: name of the service requested.
        service_duration_minutes: duration of the service in minutes (default 60).
        Returns a list of available time slots or a message if none are available.
        """
        if not google_calendar_id or google_calendar_id == "Not configured":
            return "The calendar is not configured yet. Please contact the salon directly to book."

        try:
            local_tz = pytz.timezone(timezone)
            date = datetime.strptime(date_str, "%Y-%m-%d")
            date = local_tz.localize(date)

            slots = await calendar_service.get_available_slots(
                calendar_id=google_calendar_id,
                date=date,
                service_duration_minutes=service_duration_minutes,
                business_hours=business_hours,
                tz=timezone,
            )

            if not slots:
                day_name = date.strftime("%A")
                return f"No availability found on {date.strftime('%B %d, %Y')} ({day_name}). The salon may be closed or fully booked."

            slot_list = slots[:6]
            result = f"Available slots on {date.strftime('%B %d, %Y')}:\n" + "\n".join(f"- {s}" for s in slot_list)
            if len(slots) > 6:
                result += f"\n(And {len(slots) - 6} more slots available — ask if you'd like to see more)"
            return result

        except ValueError:
            return "Invalid date format. Please provide the date as YYYY-MM-DD."
        except Exception as e:
            logger.error("check_availability error: %s", e)
            raise

    @tool
    async def book_appointment(
        date_str: str,
        time_str: str,
        service_name: str,
        service_duration_minutes: int,
        customer_name: str,
    ) -> str:
        """
        Book an appointment. Call this only after the customer confirms all details.
        date_str: date in YYYY-MM-DD format.
        time_str: time in HH:MM (24h) format.
        service_name: exact service name as listed.
        service_duration_minutes: duration in minutes.
        customer_name: the customer's full name.
        Returns confirmation details or an error message.
        """
        if not google_calendar_id or google_calendar_id == "Not configured":
            return "The calendar is not configured yet. Please contact the salon directly to book."

        try:
            local_tz = pytz.timezone(timezone)
            naive_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
            start_dt = local_tz.localize(naive_dt)
            end_dt = start_dt + timedelta(minutes=service_duration_minutes)

            # Find service in DB to get service_id
            async with db_session_factory() as db:
                service = await booking_service.get_service_by_name(db, salon_id, service_name)
                if service is None:
                    return f"Service '{service_name}' not found. Please check the service name."

                # Create Google Calendar event
                event_summary = f"{service_name} - {customer_name}"
                event_description = f"Customer WhatsApp: {customer_id}\nService: {service_name}"
                gcal_event_id = await calendar_service.create_calendar_event(
                    calendar_id=google_calendar_id,
                    summary=event_summary,
                    start_dt=start_dt.astimezone(pytz.utc),
                    end_dt=end_dt.astimezone(pytz.utc),
                    description=event_description,
                )

                # Update customer name if provided
                from app.models.customer import Customer
                from sqlalchemy import select
                result = await db.execute(select(Customer).where(Customer.id == customer_id))
                customer = result.scalar_one_or_none()
                if customer and customer.name != customer_name:
                    customer.name = customer_name
                    await db.commit()

                # Save booking to DB
                booking = await booking_service.create_booking(
                    db=db,
                    salon_id=salon_id,
                    customer_id=customer_id,
                    service_id=service.id,
                    appointment_datetime=start_dt.astimezone(pytz.utc),
                    duration_minutes=service_duration_minutes,
                    google_calendar_event_id=gcal_event_id,
                )

            formatted_dt = start_dt.strftime("%A, %B %d at %I:%M %p")

            # Notify salon owner via WhatsApp
            if salon_context and salon_context.get("notify_on_booking") and salon_context.get("owner_whatsapp_number"):
                try:
                    owner_msg = (
                        f"New booking!\n"
                        f"Service: {service_name}\n"
                        f"Customer: {customer_name} ({customer_id})\n"
                        f"Date & Time: {formatted_dt}\n"
                        f"Booking ID: {str(booking.id)[:8]}"
                    )
                    await send_text_message(
                        phone_number_id=salon_context["phone_number_id"],
                        access_token=salon_context["access_token"],
                        to=salon_context["owner_whatsapp_number"],
                        text=owner_msg,
                    )
                except Exception as notify_err:
                    logger.warning("Owner notification failed: %s", notify_err)

            return (
                f"Appointment confirmed!\n"
                f"Service: {service_name}\n"
                f"Date & Time: {formatted_dt}\n"
                f"Name: {customer_name}\n"
                f"Booking ID: {str(booking.id)[:8]}"
            )

        except Exception as e:
            logger.error("book_appointment error: %s", e)
            raise

    @tool
    async def get_customer_bookings() -> str:
        """
        Look up the customer's upcoming confirmed appointments.
        Returns a list of bookings or a message if none exist.
        """
        try:
            async with db_session_factory() as db:
                bookings = await booking_service.get_customer_upcoming_bookings(
                    db=db, customer_id=customer_id, salon_id=salon_id
                )

            if not bookings:
                return "No upcoming appointments found."

            local_tz = pytz.timezone(timezone)
            lines = []
            for b in bookings:
                local_dt = b.appointment_datetime.astimezone(local_tz)
                lines.append(
                    f"- {b.service.name} on {local_dt.strftime('%A, %B %d at %I:%M %p')} "
                    f"(Booking ID: {str(b.id)[:8]})"
                )
            return "Your upcoming appointments:\n" + "\n".join(lines)

        except Exception as e:
            logger.error("get_customer_bookings error: %s", e)
            raise

    @tool
    async def cancel_appointment(booking_id_prefix: str) -> str:
        """
        Cancel an existing appointment by its booking ID prefix (first 8 characters shown in confirmation).
        booking_id_prefix: the booking ID prefix shown in the confirmation message.
        Returns a cancellation confirmation or error message.
        """
        try:
            async with db_session_factory() as db:
                # Fetch customer's bookings and find by prefix
                bookings = await booking_service.get_customer_upcoming_bookings(
                    db=db, customer_id=customer_id, salon_id=salon_id
                )
                target = None
                for b in bookings:
                    if str(b.id).startswith(booking_id_prefix) or str(b.id)[:8] == booking_id_prefix:
                        target = b
                        break

                if target is None:
                    return (
                        f"No upcoming booking found with ID starting with '{booking_id_prefix}'. "
                        "Please check the ID or ask me to list your appointments."
                    )

                # Delete from Google Calendar if event exists
                if target.google_calendar_event_id and google_calendar_id:
                    try:
                        await calendar_service.delete_calendar_event(
                            google_calendar_id, target.google_calendar_event_id
                        )
                    except Exception as cal_err:
                        logger.warning("Could not delete calendar event: %s", cal_err)

                # Update booking status
                await booking_service.cancel_booking(db=db, booking_id=target.id)

                local_tz = pytz.timezone(timezone)
                local_dt = target.appointment_datetime.astimezone(local_tz)
                service_name = target.service.name
                formatted_dt = local_dt.strftime('%A, %B %d at %I:%M %p')

                # Notify salon owner via WhatsApp
                if salon_context and salon_context.get("notify_on_booking") and salon_context.get("owner_whatsapp_number"):
                    try:
                        owner_msg = (
                            f"Booking cancelled\n"
                            f"Service: {service_name}\n"
                            f"Date & Time: {formatted_dt}\n"
                            f"Booking ID: {str(target.id)[:8]}"
                        )
                        await send_text_message(
                            phone_number_id=salon_context["phone_number_id"],
                            access_token=salon_context["access_token"],
                            to=salon_context["owner_whatsapp_number"],
                            text=owner_msg,
                        )
                    except Exception as notify_err:
                        logger.warning("Owner notification failed: %s", notify_err)

                return (
                    f"Your {service_name} appointment on "
                    f"{formatted_dt} has been cancelled."
                )

        except Exception as e:
            logger.error("cancel_appointment error: %s", e)
            raise

    return [check_availability, book_appointment, get_customer_bookings, cancel_appointment]
