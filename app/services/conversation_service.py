import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.conversation import Conversation, Message
from app.utils.logger import get_logger

logger = get_logger(__name__)

CONVERSATION_TIMEOUT_HOURS = 24
MAX_HISTORY_MESSAGES = 20


async def get_or_create_conversation(
    db: AsyncSession, salon_id: uuid.UUID, customer_id: uuid.UUID
) -> Conversation:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CONVERSATION_TIMEOUT_HOURS)
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.salon_id == salon_id,
            Conversation.customer_id == customer_id,
            Conversation.is_active == True,
            Conversation.updated_at >= cutoff,
        )
        .order_by(desc(Conversation.updated_at))
        .limit(1)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(salon_id=salon_id, customer_id=customer_id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        logger.info("New conversation | salon=%s customer=%s", salon_id, customer_id)
    return conversation


async def save_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    whatsapp_message_id: str | None = None,
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        whatsapp_message_id=whatsapp_message_id,
    )
    db.add(msg)
    # Update conversation updated_at
    await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    await db.commit()
    await db.refresh(msg)
    return msg


async def is_duplicate_message(db: AsyncSession, whatsapp_message_id: str) -> bool:
    result = await db.execute(
        select(Message).where(Message.whatsapp_message_id == whatsapp_message_id)
    )
    return result.scalar_one_or_none() is not None


async def get_conversation_history(
    db: AsyncSession, conversation_id: uuid.UUID
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(MAX_HISTORY_MESSAGES)
    )
    messages = result.scalars().all()
    return list(reversed(messages))
