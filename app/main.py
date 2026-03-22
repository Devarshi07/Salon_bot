from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import webhook, admin, health, owner
from app.database import engine, Base
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Salon WhatsApp Bot")
    yield
    logger.info("Shutting down")
    await engine.dispose()


app = FastAPI(
    title="Salon WhatsApp Bot",
    description="Multi-tenant WhatsApp chatbot SaaS for salon businesses",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(webhook.router)
app.include_router(admin.router)
app.include_router(owner.router)
