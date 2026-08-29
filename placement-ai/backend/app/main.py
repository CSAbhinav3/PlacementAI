"""
PlacementAI backend - FastAPI + Groq (OpenAI-compatible) SSE round trip with
SQLite-backed conversation history.

POST a message to /chat and get the reply streamed back as Server-Sent
Events. Sessions and messages are persisted to a local SQLite database (see
app/db.py) so conversations survive a server restart.
"""

import json
import os
import uuid
from collections.abc import AsyncIterator

import openai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app import db
from app.groq_client import MODEL, client
from app.prompts import SYSTEM_PROMPT
from app.routers import execute, interview, problems, roadmap, resume

MAX_TOKENS = 4096

db.init_db()

app = FastAPI(title="PlacementAI backend")

cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(roadmap.router)
app.include_router(problems.router)
app.include_router(execute.router)
app.include_router(interview.router)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


def sse_event(event: str, data: dict) -> str:
    """Format one Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_chat_response(session_id: str, user_message: str) -> AsyncIterator[str]:
    yield sse_event("session", {"session_id": session_id})

    # Persist the user turn immediately, then re-read the full history from
    # the DB - it's the single source of truth for what goes to the API,
    # rather than juggling a separately-maintained in-memory copy.
    db.add_message(session_id, "user", user_message)
    history = db.get_history_for_api(session_id)

    # OpenAI-compatible chat completions have no separate top-level `system`
    # param like Anthropic - it's just the first message in the list.
    api_messages = [{"role": "system", "content": SYSTEM_PROMPT}, *history]

    reply_chunks: list[str] = []
    finish_reason = None

    try:
        stream = await client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            messages=api_messages,
            stream=True,
        )
        async for chunk in stream:
            choice = chunk.choices[0]
            if choice.delta.content:
                reply_chunks.append(choice.delta.content)
                yield sse_event("token", {"text": choice.delta.content})
            if choice.finish_reason:
                finish_reason = choice.finish_reason

        yield sse_event("done", {"stop_reason": finish_reason})

        # Only persist the reply once streaming succeeded - an error below
        # leaves the user turn saved without a reply, which is fine to
        # retry, but avoids saving a broken assistant turn.
        db.add_message(session_id, "assistant", "".join(reply_chunks))

    except openai.APIStatusError as e:
        yield sse_event("error", {"message": f"Groq API error: {e.message}"})
    except openai.APIConnectionError:
        yield sse_event("error", {"message": "Could not reach the Groq API."})


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/sessions")
async def sessions_list() -> list[dict]:
    """All sessions, newest first - for the sidebar."""
    return db.list_sessions()


@app.get("/sessions/{session_id}")
async def session_detail(session_id: str) -> dict:
    """Full message history for one session, for loading into the chat view."""
    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {**session, "messages": db.get_history_for_api(session_id)}


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    session_id = request.session_id
    if not session_id or not db.session_exists(session_id):
        session_id = str(uuid.uuid4())
        db.create_session(session_id, request.message)

    return StreamingResponse(
        stream_chat_response(session_id, request.message),
        media_type="text/event-stream",
        headers={
            # Disable buffering so events flush immediately (nginx et al).
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
