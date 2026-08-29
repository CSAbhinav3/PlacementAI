const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/** POST /interview/start - {interview_type} -> {session_id, question}. */
export async function startInterview(interviewType) {
  const res = await fetch(`${API_BASE_URL}/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interview_type: interviewType }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/** POST /interview/respond - {session_id, answer} -> {question}. */
export async function respondToInterview(sessionId, answer) {
  const res = await fetch(`${API_BASE_URL}/interview/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, answer }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/** POST /interview/end - {session_id} -> {summary}. */
export async function endInterview(sessionId) {
  const res = await fetch(`${API_BASE_URL}/interview/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
