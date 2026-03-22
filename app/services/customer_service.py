from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer import Customer
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def get_or_create_customer(db: AsyncSession, whatsapp_number: str) -> Customer:
    result = await db.execute(
        select(Customer).where(Customer.whatsapp_number == whatsapp_number)
    )
    customer = result.scalar_one_or_none()
    if customer is None:
        customer = Customer(whatsapp_number=whatsapp_number)
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        logger.info("New customer created | number=%s", whatsapp_number)
    return customer


async def update_customer_name(db: AsyncSession, customer: Customer, name: str) -> Customer:
    customer.name = name
    await db.commit()
    await db.refresh(customer)
    return customer
