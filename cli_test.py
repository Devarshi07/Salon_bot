"""
CLI test — chat with the Glamour Salon bot without WhatsApp.
Usage: python3 cli_test.py
"""
import asyncio
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models.salon import Salon
from app.models.customer import Customer
from app.models.booking import Booking, BookingStatus
from app.models.conversation import Conversation, Message
from app.agent.graph import run_agent

SALON_PHONE_NUMBER_ID = "1234567890"
TEST_CUSTOMER_NUMBER = "+15550000001"
TEST_CUSTOMER_NAME = "Test User"


async def get_or_create_customer(db) -> Customer:
    result = await db.execute(
        select(Customer).where(Customer.whatsapp_number == TEST_CUSTOMER_NUMBER)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(whatsapp_number=TEST_CUSTOMER_NUMBER, name=TEST_CUSTOMER_NAME)
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
    return customer


async def get_or_create_conversation(db, salon_id, customer_id) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.salon_id == salon_id,
            Conversation.customer_id == customer_id,
            Conversation.is_active == True,
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        convo = Conversation(salon_id=salon_id, customer_id=customer_id)
        db.add(convo)
        await db.commit()
        await db.refresh(convo)
    return convo


async def get_history(db, conversation_id) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .limit(20)
    )
    return list(result.scalars().all())


async def save_messages(db, conversation_id, user_text: str, bot_reply: str):
    db.add(Message(conversation_id=conversation_id, role="user", content=user_text))
    db.add(Message(conversation_id=conversation_id, role="assistant", content=bot_reply))
    await db.commit()


async def get_upcoming_bookings(db, customer_id) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(
            Booking.customer_id == customer_id,
            Booking.status == BookingStatus.confirmed,
        )
    )
    return list(result.scalars().all())


async def chat():
    async with AsyncSessionLocal() as db:
        # Load salon with all relationships eagerly
        result = await db.execute(
            select(Salon)
            .where(Salon.whatsapp_phone_number_id == SALON_PHONE_NUMBER_ID)
            .options(
                selectinload(Salon.services),
                selectinload(Salon.policies),
                selectinload(Salon.faqs),
                selectinload(Salon.staff),
            )
        )
        salon = result.scalar_one_or_none()
        if not salon:
            print(f"Salon with phone number ID '{SALON_PHONE_NUMBER_ID}' not found. Run seed_data.py first.")
            return

        customer = await get_or_create_customer(db)
        convo = await get_or_create_conversation(db, salon.id, customer.id)

        print(f"Chatting with {salon.name} bot")
        print(f"Customer: {TEST_CUSTOMER_NUMBER} | Conversation ID: {convo.id}")
        print("Type 'quit' to exit\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("quit", "exit", "q"):
            break
        if not user_input:
            continue

        async with AsyncSessionLocal() as db:
            # Reload salon with all relationships eagerly
            result = await db.execute(
                select(Salon)
                .where(Salon.whatsapp_phone_number_id == SALON_PHONE_NUMBER_ID)
                .options(
                    selectinload(Salon.services),
                    selectinload(Salon.policies),
                    selectinload(Salon.faqs),
                    selectinload(Salon.staff),
                )
            )
            salon = result.scalar_one()
            result = await db.execute(select(Customer).where(Customer.whatsapp_number == TEST_CUSTOMER_NUMBER))
            customer = result.scalar_one()
            result = await db.execute(select(Conversation).where(
                Conversation.salon_id == salon.id,
                Conversation.customer_id == customer.id,
                Conversation.is_active == True,
            ))
            convo = result.scalar_one()

            history = await get_history(db, convo.id)
            upcoming = await get_upcoming_bookings(db, customer.id)

            try:
                reply = await run_agent(
                    salon=salon,
                    customer=customer,
                    upcoming_bookings=upcoming,
                    conversation_history=history,
                    user_message=user_input,
                    db_session_factory=AsyncSessionLocal,
                )
            except Exception as e:
                reply = f"[Agent error: {e}]"

            await save_messages(db, convo.id, user_input, reply)

        print(f"\nBot: {reply}\n")


if __name__ == "__main__":
    asyncio.run(chat())
