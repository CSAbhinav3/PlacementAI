const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * POST a RoadmapRequest payload to the (currently stub) /roadmap/generate
 * endpoint. Throws with a readable message on a non-2xx response so callers
 * can surface it, rather than silently swallowing validation errors.
 */
export async function generateRoadmap(roadmapRequest) {
  const res = await fetch(`${API_BASE_URL}/roadmap/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roadmapRequest),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
