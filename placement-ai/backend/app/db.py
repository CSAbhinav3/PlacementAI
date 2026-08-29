"""SQLite persistence for chat sessions and messages.

Plain stdlib `sqlite3`, not SQLAlchemy or `aiosqlite` - the schema is two
small tables and the queries are simple, so the extra dependency isn't
worth it. Each function opens its own short-lived connection and commits
before closing; calls run synchronously on the event loop thread (FastAPI
doesn't offload them to a worker thread), which is fine for a local,
single-user dev server but would become a bottleneck under real concurrent
load - swap in `aiosqlite` or a thread pool if this ever needs to.
"""

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

# Defaults to sitting next to the app code (fine for local dev), but is
# overridable via DB_DIR so a deployment can point it at a persistent disk
# instead - e.g. a Render disk mounted at /var/data. Deliberately a
# separate directory from the app's own source rather than DB_PATH being
# the mount point itself: a platform disk mount replaces whatever's at
# that path in the container, so mounting one directly over `app/` would
# shadow the application code.
DB_PATH = Path(os.environ.get("DB_DIR", Path(__file__).parent)) / "chat.db"

TITLE_MAX_LEN = 40


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
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
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)"
        )


def session_exists(session_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return row is not None


def create_session(session_id: str, first_message: str) -> None:
    title = " ".join(first_message.strip().split())  # collapse newlines/whitespace
    if len(title) > TITLE_MAX_LEN:
        title = title[:TITLE_MAX_LEN] + "..."
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)",
            (session_id, title, _now()),
        )


def add_message(session_id: str, role: str, content: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (session_id, role, content, _now()),
        )


def list_sessions() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at FROM sessions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def get_session(session_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, title, created_at FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
        return dict(row) if row else None


def get_history_for_api(session_id: str) -> list[dict]:
    """Message history in the {role, content} shape the Anthropic SDK expects."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        ).fetchall()
        return [dict(row) for row in rows]
