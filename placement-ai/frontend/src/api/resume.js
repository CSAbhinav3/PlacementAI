const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * POST a ResumeData payload to the (currently stub) /resume/draft endpoint.
 * Throws with a readable message on a non-2xx response so callers can
 * surface it, rather than silently swallowing validation errors.
 */
export async function submitResumeDraft(resumeData) {
  const res = await fetch(`${API_BASE_URL}/resume/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumeData),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
