from datetime import datetime, timezone
from typing import Any

from app.models.salon import Salon
from app.models.customer import Customer
from app.models.booking import Booking
import pytz


DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _format_business_hours(business_hours: dict) -> str:
    lines = []
    for day in DAY_ORDER:
        hours = business_hours.get(day)
        if hours and hours.get("open") and hours.get("close"):
            lines.append(f"- {day.capitalize()}: {hours['open']} - {hours['close']}")
        else:
            lines.append(f"- {day.capitalize()}: Closed")
    return "\n".join(lines)


def _format_services(salon: Salon) -> str:
    active_services = [s for s in salon.services if s.is_active]
    if not active_services:
        return "No services listed."
    lines = []
    categories = {}
    for svc in active_services:
        cat = svc.category or "General"
        categories.setdefault(cat, []).append(svc)
    for cat, svcs in categories.items():
        lines.append(f"\n{cat}:")
        for svc in svcs:
            desc = f" — {svc.description}" if svc.description else ""
            lines.append(f"- {svc.name}: ${svc.price:.0f} ({svc.duration_minutes} min){desc}")
    return "\n".join(lines)


def _format_policies(salon: Salon) -> str:
    if not salon.policies:
        return "No specific policies listed."
    return "\n".join(
        f"- {p.title}: {p.content}" for p in salon.policies
    )


def _format_faqs(salon: Salon) -> str:
    if not salon.faqs:
        return "No FAQs listed."
    return "\n\n".join(
        f"Q: {faq.question}\nA: {faq.answer}" for faq in salon.faqs
    )


def _format_staff(salon: Salon) -> str:
    active_staff = [s for s in salon.staff if s.is_active]
    if not active_staff:
        return "No staff listed."
    lines = []
    for member in active_staff:
        specs = f" Specializes in: {member.specialties}." if member.specialties else ""
        lines.append(f"- {member.name} ({member.role}):{specs}")
    return "\n".join(lines)


def _format_past_bookings(bookings: list[Booking], tz: str) -> str:
    if not bookings:
        return "No upcoming bookings."
    local_tz = pytz.timezone(tz)
    lines = []
    for b in bookings:
        local_dt = b.appointment_datetime.astimezone(local_tz)
        lines.append(
            f"- {b.service.name} on {local_dt.strftime('%A, %B %d at %I:%M %p')} (Status: {b.status.value})"
        )
    return "\n".join(lines)


def build_system_prompt(
    salon: Salon,
    customer: Customer,
    upcoming_bookings: list[Booking],
) -> str:
    tz = salon.timezone
    local_tz = pytz.timezone(tz)
    current_date = datetime.now(local_tz).strftime("%A, %B %d, %Y")

    persona = salon.bot_system_prompt or "You are a friendly and professional salon assistant."

    # Layer 1 — Base persona
    layer1 = f"""You are a WhatsApp salon assistant. You help customers learn about the salon, browse services, and book appointments.

CORE RULES:
- Keep messages SHORT. This is WhatsApp, not email. Max 2-3 short paragraphs per response.
- Use line breaks for readability. No markdown formatting (WhatsApp doesn't render it).
- Be warm, friendly, and professional. Match the salon's personality described below.
- Never make up information. Only use the salon details provided below.
- If you don't know something, say you'll have the salon owner get back to them.
- When presenting time slots, list max 5-6 options. If more exist, show the first few and ask if they want to see more.
- Always confirm booking details (service, date, time, name) before finalizing.
- Ask for the customer's name if you don't know it yet and they're trying to book.
- Use the customer's name naturally once you know it.
- Today's date is {current_date}. Use this to resolve relative dates like "tomorrow", "this Saturday", "next week".
- The salon's timezone is {tz}. All times should be in this timezone.
- Do NOT offer services the salon doesn't have listed.
- For cancellations, ask for the date/time of their existing booking to look it up.
- If a customer seems upset or has a complaint, empathize and offer to connect them with the salon owner directly."""

    # Layer 2 — Salon identity
    layer2 = f"""
SALON IDENTITY:
- Name: {salon.name}
- Personality: {persona}
- Address: {salon.address or "Not specified"}
- Phone: {salon.phone_number}
- Timezone: {tz}

BUSINESS HOURS:
{_format_business_hours(salon.business_hours)}"""

    # Layer 3 — Knowledge base
    additional = f"\nADDITIONAL INFO:\n{salon.additional_info}" if salon.additional_info else ""
    layer3 = f"""
SERVICES OFFERED:
{_format_services(salon)}

SALON POLICIES:
{_format_policies(salon)}

FREQUENTLY ASKED QUESTIONS:
{_format_faqs(salon)}

STYLISTS/STAFF:
{_format_staff(salon)}{additional}"""

    # Layer 4 — Conversation context
    customer_name = customer.name or "Unknown — ask for their name if they want to book"
    layer4 = f"""
CUSTOMER CONTEXT:
- WhatsApp number: {customer.whatsapp_number}
- Name: {customer_name}
- Upcoming bookings: {_format_past_bookings(upcoming_bookings, tz)}

When calling tools, use:
- salon_id: {salon.id}
- google_calendar_id: {salon.google_calendar_id or "Not configured"}
- timezone: {tz}"""

    return layer1 + layer2 + layer3 + layer4
