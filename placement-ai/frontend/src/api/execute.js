const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * POST /execute/run - runs `code` against the problem's visible test cases
 * and returns per-test-case {input, expected_output, actual_output, passed,
 * stderr}.
 */
export async function runCode(problemId, code) {
  const res = await fetch(`${API_BASE_URL}/execute/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem_id: problemId, code }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/**
 * POST /execute/submit - runs `code` against the problem's hidden test
 * cases and returns only the aggregate {passed_count, total_count, verdict}.
 */
export async function submitCode(problemId, code) {
  const res = await fetch(`${API_BASE_URL}/execute/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem_id: problemId, code }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.detail ? JSON.stringify(body.detail) : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}
