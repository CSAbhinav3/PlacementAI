const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * GET /problems - list of {id, title, difficulty, topic, companies}; no
 * test cases are ever included in this response. The full list is always
 * returned - topic/difficulty/company filtering happens client-side in
 * TechnicalInterview.jsx.
 */
export async function listProblems() {
  const res = await fetch(`${API_BASE_URL}/problems`);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/**
 * GET /problems/{id} - full problem detail plus visible_test_cases.
 * hidden_test_cases is never sent by the backend for this endpoint.
 */
export async function getProblem(id) {
  const res = await fetch(`${API_BASE_URL}/problems/${encodeURIComponent(id)}`);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
