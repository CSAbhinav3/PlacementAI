# PlacementAI backend

FastAPI service exposing a single `/chat` endpoint that streams a Claude
response back over Server-Sent Events (SSE).

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

Edit `.env` and set `GROQ_API_KEY` to your key from
https://console.groq.com/keys, plus `TURSO_DATABASE_URL` and
`TURSO_AUTH_TOKEN` from a free database at https://turso.tech - chat
history is persisted there, not to a local SQLite file. See
`.env.example` for the full list.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Try it

```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Say hello in one sentence.\"}"
```

You should see a stream of `event: token` / `data: {...}` frames followed by
`event: done`.
