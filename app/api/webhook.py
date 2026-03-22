from contextlib import asynccontextmanager
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.schemas.webhook import WhatsAppWebhookPayload
from app.services import salon_service, customer_service, conversation_service
from app.services.whatsapp import send_text_message
from app.services.encryption import decrypt_token
from app.services.booking_service import get_customer_upcoming_bookings
from app.agent.graph import run_agent
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()
settings = get_settings()


@asynccontextmanager
async def db_session_factory():
    async with AsyncSessionLocal() as session:
        yield session


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        logger.info("Webhook verified")
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive WhatsApp webhook. Returns 200 immediately, processes in background."""
    body = await request.json()
    background_tasks.add_task(_process_webhook, body)
    return {"status": "ok"}


async def _process_webhook(body: dict) -> None:
    try:
        payload = WhatsAppWebhookPayload.model_validate(body)
    except Exception as e:
        logger.error("Failed to parse webhook payload: %s", e)
        return

    for entry in payload.entry:
        for change in entry.changes:
            value = change.value
            if not value.messages:
                continue

            phone_number_id = value.metadata.phone_number_id

            for raw_msg in value.messages:
                # Only handle text messages in MVP
                if raw_msg.type != "text" or not raw_msg.text:
                    logger.info("Ignoring non-text message type: %s", raw_msg.type)
                    continue

                customer_number = raw_msg.from_
                message_text = raw_msg.text.body
                whatsapp_message_id = raw_msg.id

                await _handle_message(
                    phone_number_id=phone_number_id,
                    customer_number=customer_number,
                    message_text=message_text,
                    whatsapp_message_id=whatsapp_message_id,
                )


async def _handle_message(
    phone_number_id: str,
    customer_number: str,
    message_text: str,
    whatsapp_message_id: str,
) -> None:
    fallback = "Sorry, I'm having a brief issue. Please try again in a moment."

    async with AsyncSessionLocal() as db:
        try:
            # Load salon by phone number ID
            salon = await salon_service.get_salon_by_phone_number_id(db, phone_number_id)
            if salon is None:
                logger.warning("No salon found for phone_number_id=%s", phone_number_id)
                return

            # Deduplicate messages
            is_dup = await conversation_service.is_duplicate_message(db, whatsapp_message_id)
            if is_dup:
                logger.info("Duplicate message ignored: %s", whatsapp_message_id)
                return

            # Get or create customer
            customer = await customer_service.get_or_create_customer(db, customer_number)

            # Get or create active conversation
            conversation = await conversation_service.get_or_create_conversation(
                db, salon.id, customer.id
            )

            # Save user message
            await conversation_service.save_message(
                db, conversation.id, "user", message_text, whatsapp_message_id
            )

            # Load conversation history
            history = await conversation_service.get_conversation_history(db, conversation.id)
            # Exclude the message we just saved (it gets added to agent as the current turn)
            history = history[:-1]

            # Load upcoming bookings for context
            upcoming_bookings = await get_customer_upcoming_bookings(db, customer.id, salon.id)

            # Decrypt access token
            access_token = decrypt_token(salon.whatsapp_access_token_encrypted)

        except Exception as e:
            logger.exception("Error setting up message processing: %s", e)
            return

    # Run agent (outside the DB session — tools open their own sessions via factory)
    try:
        response_text = await run_agent(
            salon=salon,
            customer=customer,
            upcoming_bookings=upcoming_bookings,
            conversation_history=history,
            user_message=message_text,
            db_session_factory=db_session_factory,
            phone_number_id=phone_number_id,
            access_token=access_token,
        )
    except Exception as e:
        logger.exception("Agent error: %s", e)
        response_text = fallback

    # Save assistant response and send WhatsApp message
    async with AsyncSessionLocal() as db:
        try:
            await conversation_service.save_message(
                db, conversation.id, "assistant", response_text
            )
        except Exception as e:
            logger.error("Failed to save assistant message: %s", e)

    try:
        await send_text_message(
            phone_number_id=phone_number_id,
            access_token=access_token,
            to=customer_number,
            text=response_text,
        )
    except Exception as e:
        logger.exception("Failed to send WhatsApp message: %s", e)
