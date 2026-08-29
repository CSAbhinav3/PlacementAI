const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * GET /sessions/{id} - full session detail including its message history,
 * in the {role, content} shape used to hydrate the chat view.
 */
export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
