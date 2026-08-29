const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * POST a message to the backend and consume the Server-Sent Events response.
 *
 * The backend's `/chat` endpoint streams frames of the form:
 *   event: session\ndata: {"session_id": "..."}\n\n   (always sent first)
 *   event: token\ndata: {"text": "..."}\n\n
 *   event: done\ndata: {"stop_reason": "..."}\n\n
 *   event: error\ndata: {"message": "..."}\n\n
 *
 * The browser's native EventSource only supports GET, so we read the
 * streamed response body by hand with fetch + a ReadableStream reader.
 *
 * @param {string} message
 * @param {string | null} sessionId - pass null on the first message; the backend mints one
 * @param {{ onSession?: (sessionId: string) => void, onToken?: (text: string) => void, onDone?: () => void, onError?: (message: string) => void, signal?: AbortSignal }} handlers
 */
export async function streamChat(
  message,
  sessionId,
  { onSession, onToken, onDone, onError, signal } = {},
) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal,
    });
  } catch (err) {
    onError?.(`Could not reach the backend: ${err.message}`);
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(`Backend returned ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // keep the last (possibly incomplete) frame

    for (const frame of frames) {
      const { event, data } = parseFrame(frame);
      if (!event || !data) continue;

      const parsed = JSON.parse(data);
      if (event === "session") onSession?.(parsed.session_id);
      else if (event === "token") onToken?.(parsed.text);
      else if (event === "done") onDone?.();
      else if (event === "error") onError?.(parsed.message);
    }
  }
}

function parseFrame(frame) {
  let event = null;
  let data = null;
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice("event: ".length).trim();
    else if (line.startsWith("data: ")) data = line.slice("data: ".length);
  }
  return { event, data };
}
