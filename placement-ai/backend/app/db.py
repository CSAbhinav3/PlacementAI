"""Turso (libSQL) persistence for chat sessions and messages.

Swapped from a local `chat.db` SQLite file to Turso - a hosted,
SQLite-compatible database reachable over HTTP - because this backend
runs as a Vercel serverless function: each invocation can start in a
fresh container with no local disk carried over from the last one, so
a file sitting next to the app code wouldn't survive between requests.
Turso's `libsql_client` runs the exact same SQL over HTTP instead, so
the schema and query shapes below are otherwise unchanged from the
SQLite version this replaced.

Needs TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment - see
https://turso.tech (free tier, no card required) for creating a
database and minting a token.

The module-level `_client`/`_schema_ready` globals are deliberate: a
warm Vercel container reuses the same Python process across requests,
so caching the client and skipping the CREATE TABLE IF NOT EXISTS
statements after the first call saves a round trip on every request
after the first in that container.
"""

import os
from datetime import datetime, timezone

import libsql_client

TITLE_MAX_LEN = 40

_client: libsql_client.Client | None = None
_schema_ready = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_client() -> libsql_client.Client:
    global _client
    if _client is None:
        _client = libsql_client.create_client(
            url=os.environ["TURSO_DATABASE_URL"],
            auth_token=os.environ["TURSO_AUTH_TOKEN"],
        )
    return _client


def _rows_to_dicts(result_set: libsql_client.ResultSet) -> list[dict]:
    return [dict(zip(result_set.columns, row)) for row in result_set.rows]


async def init_db() -> None:
    global _schema_ready
    if _schema_ready:
        return
    client = _get_client()
    await client.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    await client.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)"
    )
    _schema_ready = True


async def session_exists(session_id: str) -> bool:
    await init_db()
    rs = await _get_client().execute("SELECT 1 FROM sessions WHERE id = ?", [session_id])
    return len(rs.rows) > 0


async def create_session(session_id: str, first_message: str) -> None:
    await init_db()
    title = " ".join(first_message.strip().split())  # collapse newlines/whitespace
    if len(title) > TITLE_MAX_LEN:
        title = title[:TITLE_MAX_LEN] + "..."
    await _get_client().execute(
        "INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)",
        [session_id, title, _now()],
    )


async def add_message(session_id: str, role: str, content: str) -> None:
    await init_db()
    await _get_client().execute(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [session_id, role, content, _now()],
    )


async def list_sessions() -> list[dict]:
    await init_db()
    rs = await _get_client().execute(
        "SELECT id, title, created_at FROM sessions ORDER BY created_at DESC"
    )
    return _rows_to_dicts(rs)


async def get_session(session_id: str) -> dict | None:
    await init_db()
    rs = await _get_client().execute(
        "SELECT id, title, created_at FROM sessions WHERE id = ?", [session_id]
    )
    rows = _rows_to_dicts(rs)
    return rows[0] if rows else None


async def get_history_for_api(session_id: str) -> list[dict]:
    """Message history in the {role, content} shape the Groq/OpenAI SDK expects."""
    await init_db()
    rs = await _get_client().execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",
        [session_id],
    )
    return _rows_to_dicts(rs)
