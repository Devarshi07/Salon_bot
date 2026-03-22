# Salon WhatsApp Bot

A multi-tenant WhatsApp chatbot SaaS for salon businesses. Customers message the salon's WhatsApp number and an AI agent handles the conversation — answering questions, checking availability, and booking appointments via Google Calendar.

## Features

- Multi-tenant — one codebase, unlimited salons, each fully isolated
- AI agent (Google Gemini) that understands services, hours, policies, and staff
- Real-time booking via Google Calendar (check availability, create/cancel events)
- WhatsApp notifications to salon owner on every booking/cancellation
- Admin dashboard — manage all salons, services, FAQs, staff, bookings, conversations
- Salon owner portal — read-only view of their own bookings and conversations
- Message deduplication, conversation history, 24h session timeout

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11+ |
| AI Agent | LangGraph + LangChain (ReAct) |
| LLM | Google Gemini 2.0 Flash |
| Database | PostgreSQL on Supabase (asyncpg) |
| Messaging | WhatsApp Cloud API (Meta) |
| Calendar | Google Calendar API (Service Account) |
| Frontend | React + Vite + Tailwind CSS |
| Hosting | Render (backend) + Vercel (frontend) |

## Project Structure

```
├── app/
│   ├── main.py                  # FastAPI app, middleware, router setup
│   ├── config.py                # Settings from env vars
│   ├── database.py              # Async SQLAlchemy engine
│   ├── models/                  # SQLAlchemy ORM models
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── api/
│   │   ├── webhook.py           # WhatsApp webhook (GET verify + POST messages)
│   │   ├── admin.py             # Admin CRUD endpoints
│   │   ├── owner.py             # Salon owner read-only portal API
│   │   └── health.py            # /health for uptime monitoring
│   ├── services/
│   │   ├── whatsapp.py          # Send messages via WhatsApp Cloud API
│   │   ├── salon_service.py     # Salon + knowledge base CRUD
│   │   ├── booking_service.py   # Booking CRUD
│   │   ├── calendar_service.py  # Google Calendar read/write
│   │   ├── conversation_service.py
│   │   ├── customer_service.py
│   │   └── encryption.py        # Fernet encrypt/decrypt for tokens
│   └── agent/
│       ├── graph.py             # LangGraph ReAct agent
│       ├── tools.py             # check_availability, book_appointment, cancel, lookup
│       ├── prompt_builder.py    # 4-layer dynamic system prompt
│       └── state.py             # Agent state type
├── frontend/                    # React admin + owner portal
├── alembic/                     # DB migrations
├── seed_data.py                 # Seeds test "Glamour Salon"
├── render.yaml                  # Render deployment config
└── .env.example                 # All required env vars
```

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd "Whatsapp chatbot"
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | How to get it |
|----------|--------------|
| `DATABASE_URL` | Supabase → Settings → Database → URI (add `+asyncpg` after `postgresql`) |
| `WHATSAPP_VERIFY_TOKEN` | Any random string — set the same in Meta dashboard |
| `ENCRYPTION_KEY` | Run: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud Console → Service Account → JSON key (full JSON, one line) |
| `ADMIN_API_KEY` | Any strong random string |

### 3. Run database migrations

```bash
alembic upgrade head
```

### 4. Seed test data

```bash
python3 seed_data.py
```

This creates "Glamour Salon" with services, policies, FAQs, and staff.

### 5. Start the backend

```bash
uvicorn app.main:app --reload --port 8001
```

API docs available at: http://localhost:8001/docs

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Admin dashboard: http://localhost:5173
Salon owner portal: http://localhost:5173/owner-login

## Portals

### Admin Dashboard (`/`)
Login with your `ADMIN_API_KEY`. Manage all salons, services, FAQs, policies, staff, bookings, and conversations.

### Salon Owner Portal (`/owner-login`)
Each salon owner gets a unique read-only link generated from the admin Settings page. They can view their bookings, conversations, and stats — but cannot edit anything.

**To generate an owner link:**
1. Go to Settings in the admin dashboard
2. Click "Generate Owner Portal Link"
3. Copy and send the link to the salon owner

## WhatsApp Setup

1. Create a [Meta Developer](https://developers.facebook.com) app → add WhatsApp product
2. Get the **Phone Number ID** and **Access Token** from the dashboard
3. Register the salon via `POST /admin/salons` with those credentials
4. Expose your server (ngrok locally, or deploy to Render)
5. Register webhook URL in Meta dashboard: `https://your-domain.com/webhook`
6. Set verify token to match `WHATSAPP_VERIFY_TOKEN` in `.env`
7. Subscribe to the `messages` field

## Google Calendar Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Create a **Service Account** → download JSON key
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env` (paste full JSON as one line)
5. Salon owner shares their Google Calendar with the service account email
6. Set `google_calendar_id` on the salon record

## Deployment

### Backend (Render)

1. Push to GitHub
2. Connect repo to [Render](https://render.com) → new Web Service
3. Set all environment variables in Render dashboard
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Register webhook URL with Meta: `https://your-app.onrender.com/webhook`
7. Set up [UptimeRobot](https://uptimerobot.com) to ping `/health` every 14 minutes (prevents cold starts)

### Frontend (Vercel)

1. Set environment variable in Vercel: `VITE_API_URL=https://your-app.onrender.com`
2. Update `frontend/src/api/client.js` to use `import.meta.env.VITE_API_URL`
3. Connect repo to [Vercel](https://vercel.com) → new project → set root to `frontend/`

## Onboarding a New Salon

```bash
# 1. Register the salon
POST /admin/salons
{
  "name": "Chop Shop",
  "phone_number": "+16175550200",
  "whatsapp_phone_number_id": "<from Meta>",
  "whatsapp_access_token": "<from Meta>",
  "address": "456 Elm St, Boston MA",
  "timezone": "America/New_York",
  "business_hours": {
    "monday": {"open": "10:00", "close": "19:00"},
    ...
    "sunday": null
  },
  "bot_system_prompt": "You're the assistant for Chop Shop. Be casual and fun.",
  "google_calendar_id": "xxx@group.calendar.google.com",
  "owner_whatsapp_number": "+16175550201"
}

# 2. Add services, policies, FAQs, staff via admin dashboard or API
# 3. Generate owner portal link via Settings page
# 4. Done — bot is live on their WhatsApp number
```

## Scalability

Comfortably handles **20+ salons, 100 users/day per salon** on the current free/low-cost stack:

| Service | Plan | Cost |
|---------|------|------|
| Render | Starter | $7/mo |
| Supabase | Free | $0 |
| Gemini | Free tier | $0 |
| Vercel | Free | $0 |
| UptimeRobot | Free | $0 |

The only scaling concern is Gemini's 15 RPM free tier limit during peak hours — add retry logic (`tenacity`) or upgrade to paid at 50+ salons.
