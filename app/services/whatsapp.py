import httpx
from app.utils.logger import get_logger

logger = get_logger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
MAX_MESSAGE_LENGTH = 4000


async def send_text_message(
    phone_number_id: str,
    access_token: str,
    to: str,
    text: str,
) -> None:
    """Send a WhatsApp text message. Splits messages > MAX_MESSAGE_LENGTH automatically."""
    chunks = _split_message(text)
    async with httpx.AsyncClient() as client:
        for chunk in chunks:
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": chunk},
            }
            resp = await client.post(
                f"{GRAPH_BASE}/{phone_number_id}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )
            if resp.status_code != 200:
                logger.error(
                    "WhatsApp API error | status=%s | body=%s",
                    resp.status_code,
                    resp.text,
                )
            else:
                logger.info("Message sent to %s", to)


def _split_message(text: str) -> list[str]:
    if len(text) <= MAX_MESSAGE_LENGTH:
        return [text]
    chunks = []
    while text:
        chunk = text[:MAX_MESSAGE_LENGTH]
        # Try to split at a newline boundary to avoid cutting mid-sentence
        split_pos = chunk.rfind("\n", MAX_MESSAGE_LENGTH // 2)
        if split_pos == -1:
            split_pos = MAX_MESSAGE_LENGTH
        chunks.append(text[:split_pos].strip())
        text = text[split_pos:].strip()
    return chunks
