"""
Seed script — populates the database with a test salon (Glamour Salon) for development.
Usage: python seed_data.py
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.salon import Salon
from app.services.salon_service import create_salon, create_service, create_policy, create_faq, create_staff
from app.schemas.salon import SalonCreate, ServiceCreate, PolicyCreate, FAQCreate, StaffCreate

TEST_WHATSAPP_TOKEN = "YOUR_TEST_WHATSAPP_TOKEN_HERE"

SALON_DATA = SalonCreate(
    name="Glamour Salon",
    phone_number="+16175550100",
    whatsapp_phone_number_id="1234567890",  # Replace with Meta test phone number ID
    whatsapp_access_token=TEST_WHATSAPP_TOKEN,
    address="123 Main St, Boston, MA 02101",
    business_hours={
        "monday": {"open": "09:00", "close": "18:00"},
        "tuesday": {"open": "09:00", "close": "18:00"},
        "wednesday": {"open": "09:00", "close": "18:00"},
        "thursday": {"open": "09:00", "close": "18:00"},
        "friday": {"open": "09:00", "close": "18:00"},
        "saturday": {"open": "10:00", "close": "16:00"},
        "sunday": None,
    },
    timezone="America/New_York",
    bot_system_prompt=(
        "You are the friendly and warm assistant for Glamour Salon! "
        "Be enthusiastic about beauty and use a casual, welcoming tone. "
        "Use the occasional emoji to keep things fun!"
    ),
    google_calendar_id=os.environ.get("TEST_GOOGLE_CALENDAR_ID", ""),
    additional_info="Free parking is available behind our building on Elm Street.",
)

SERVICES = [
    ServiceCreate(name="Women's Haircut", description="Includes wash, cut, and blowdry", duration_minutes=45, price=55.0, category="Hair"),
    ServiceCreate(name="Men's Haircut", description="Clean cut and style", duration_minutes=30, price=35.0, category="Hair"),
    ServiceCreate(name="Balayage", description="Hand-painted highlights for a natural sun-kissed look", duration_minutes=120, price=180.0, category="Hair"),
    ServiceCreate(name="Blowout", description="Professional wash and blowdry", duration_minutes=30, price=45.0, category="Hair"),
    ServiceCreate(name="Gel Manicure", description="Long-lasting gel polish application", duration_minutes=30, price=40.0, category="Nails"),
    ServiceCreate(name="Pedicure", description="Full pedicure with polish", duration_minutes=45, price=50.0, category="Nails"),
    ServiceCreate(name="Facial", description="Deep-cleansing facial treatment", duration_minutes=60, price=90.0, category="Skin"),
    ServiceCreate(name="Eyebrow Threading", description="Precise threading for perfectly shaped brows", duration_minutes=15, price=15.0, category="Skin"),
]

POLICIES = [
    PolicyCreate(
        title="Cancellation Policy",
        content="Please cancel at least 24 hours in advance. Late cancellations may be charged 50% of the service price.",
        category="booking",
    ),
    PolicyCreate(
        title="Late Arrival Policy",
        content="If you're more than 15 minutes late, we may need to reschedule your appointment to keep other clients on time.",
        category="booking",
    ),
    PolicyCreate(
        title="Payment Methods",
        content="We accept cash, all major credit cards (Visa, Mastercard, Amex), and mobile payments (Apple Pay, Google Pay).",
        category="payment",
    ),
]

FAQS = [
    FAQCreate(
        question="Do you take walk-ins?",
        answer="We primarily work by appointment, but walk-ins are welcome if we have availability! Give us a call or message us to check.",
    ),
    FAQCreate(
        question="Is there parking nearby?",
        answer="Yes! Free parking is available behind our building on Elm Street.",
    ),
    FAQCreate(
        question="Should I tip?",
        answer="Tipping is always appreciated but never required. Most clients tip 15-20% of the service total.",
    ),
    FAQCreate(
        question="What products do you use?",
        answer="We use professional-grade products from Olaplex, Redken, and OPI. We also carry retail products for purchase.",
    ),
    FAQCreate(
        question="Do you do kids' haircuts?",
        answer="Yes! We love helping little ones look their best. Kids' cuts (12 and under) are $25.",
    ),
]

STAFF = [
    StaffCreate(
        name="Maria",
        role="Owner / Senior Stylist",
        specialties="Color corrections, balayage, highlights. 10+ years of experience.",
    ),
    StaffCreate(
        name="Jake",
        role="Stylist",
        specialties="Men's cuts, fades, and beard trims.",
    ),
    StaffCreate(
        name="Priya",
        role="Nail Technician",
        specialties="Gel manicures, acrylics, pedicures, and nail art.",
    ),
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Check if salon already exists
        result = await db.execute(
            select(Salon).where(Salon.whatsapp_phone_number_id == SALON_DATA.whatsapp_phone_number_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"Glamour Salon already exists (ID: {existing.id}) — skipping seed.")
            print(f"WhatsApp Phone Number ID: {existing.whatsapp_phone_number_id}")
            return

        print("Creating Glamour Salon...")
        salon = await create_salon(db, SALON_DATA)
        print(f"  Salon created: {salon.id}")

        print("Adding services...")
        for svc_data in SERVICES:
            svc = await create_service(db, salon.id, svc_data)
            print(f"  Service: {svc.name}")

        print("Adding policies...")
        for policy_data in POLICIES:
            policy = await create_policy(db, salon.id, policy_data)
            print(f"  Policy: {policy.title}")

        print("Adding FAQs...")
        for faq_data in FAQS:
            faq = await create_faq(db, salon.id, faq_data)
            print(f"  FAQ: {faq.question[:50]}...")

        print("Adding staff...")
        for staff_data in STAFF:
            member = await create_staff(db, salon.id, staff_data)
            print(f"  Staff: {member.name}")

        print("\nDone! Glamour Salon is ready for testing.")
        print(f"Salon ID: {salon.id}")
        print(f"WhatsApp Phone Number ID: {salon.whatsapp_phone_number_id}")


if __name__ == "__main__":
    asyncio.run(seed())
