import { useEffect, useState } from "react";
import { getSession } from "../api/sessions";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function relativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString();
}

/**
 * Session list + "New Chat". Fetches GET /sessions on mount and whenever
 * `refreshSignal` changes (bumped by the parent after a brand-new session's
 * first turn completes, so the sidebar picks up its title).
 */
export default function Sidebar({ currentSessionId, refreshSignal, onSelectSession, onNewChat }) {
  const [sessions, setSessions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSessionId, setLoadingSessionId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/sessions`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch(() => {
        // Sidebar staying stale/empty on a fetch failure is an acceptable
        // degradation for local dev - the chat itself still works.
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  async function handleClick(sessionId) {
    // Always (re)fetch, even for the already-active session - matching
    // currentSessionId doesn't mean the chat view actually has that
    // session's messages loaded (e.g. right after a page refresh or
    // switching back from another module, the id is restored but the
    // message list starts empty).
    if (loadingSessionId) return;

    setLoadingSessionId(sessionId);
    try {
      const data = await getSession(sessionId);
      onSelectSession(sessionId, data.messages);
    } catch {
      // Fetch failed (session deleted, network hiccup, ...) - leave the
      // current view as-is rather than clearing it out from under the user.
    } finally {
      setLoadingSessionId(null);
    }
  }

  return (
    <aside className="sidebar">
      <button className="new-chat-button" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="sidebar-sessions">
        {loadingList && <p className="sidebar-empty">Loading...</p>}
        {!loadingList && sessions.length === 0 && (
          <p className="sidebar-empty">No conversations yet</p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            className={`sidebar-session${session.id === currentSessionId ? " active" : ""}`}
            onClick={() => handleClick(session.id)}
            disabled={loadingSessionId === session.id}
          >
            <span className="sidebar-session-title">{session.title}</span>
            <span className="sidebar-session-time">{relativeTime(session.created_at)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
