# PlacementAI

Full-stack scaffold with a working "hello world" streaming round trip:
type a message in the React UI, it POSTs to a FastAPI backend, which streams
Claude's response back over Server-Sent Events (SSE) token by token.

No chat history, retries, or real product logic yet - this just proves the
pipeline (browser -> FastAPI -> Anthropic API -> SSE -> browser) works.

## Structure

```
placement-ai/
├── backend/    FastAPI + Anthropic SDK, POST /chat -> SSE stream
└── frontend/   React (Vite) chat UI, fetch-based SSE consumer
```

## Run it

**Backend** (see `backend/README.md` for details):

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then set ANTHROPIC_API_KEY inside
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal):

```bash
cd frontend
npm install
copy .env.example .env   # defaults already point at localhost:8000
npm run dev
```

Open the printed Vite URL (default http://localhost:5173), type a message,
and watch the response stream in.

## Next steps (not built yet, on purpose)

- Persist conversation history and send it back to `/chat` on each turn
- Reconnect/retry handling for dropped SSE streams
- Auth, rate limiting, and a real system prompt

## Deploying

See [`DEPLOY.md`](./DEPLOY.md) for hosting this on Render (backend) +
Vercel (frontend).
