import { useEffect, useRef, useState } from "react";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import { streamChat } from "../api/streamChat";
import { getSession } from "../api/sessions";

let nextId = 1;

const SESSION_STORAGE_KEY = "placement-ai.session_id";

function messagesFromHistory(history) {
  return history.map((m) => ({ id: nextId++, role: m.role, text: m.content }));
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // Persisted so a page refresh - or navigating to another module and back -
  // keeps talking to the same backend session.
  const [sessionId, setSessionId] = useState(
    () => sessionStorage.getItem(SESSION_STORAGE_KEY) || null,
  );
  // True only while restoring a just-mounted session's history - a
  // sessionId restored from sessionStorage doesn't mean `messages` is
  // populated yet, so this keeps the "Say hello..." empty state from
  // flashing while that fetch is in flight.
  const [isRestoringHistory, setIsRestoringHistory] = useState(Boolean(sessionId));
  // Bumped to make Sidebar refetch GET /sessions - e.g. once a brand-new
  // session's first turn completes and its title exists in the DB.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const abortRef = useRef(null);

  // Restore the previously-active session's history once, right after
  // mount - covers both a page refresh and navigating away to another
  // module and back. Subsequent session switches go through
  // handleSelectSession instead, which already sets `messages` directly.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    getSession(sessionId)
      .then((data) => {
        if (!cancelled) setMessages(messagesFromHistory(data.messages));
      })
      .catch(() => {
        // Session may have been deleted, or the backend's briefly
        // unreachable - leave the chat looking fresh rather than stuck
        // loading; the stored session id is still valid for continuing
        // the conversation server-side either way (or the backend mints
        // a new one on the next send, if it's really gone).
      })
      .finally(() => {
        if (!cancelled) setIsRestoringHistory(false);
      });

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateMessage(id, updater) {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }

  async function handleSend(text) {
    const wasNewSession = sessionId === null;
    const userId = nextId++;
    const assistantId = nextId++;

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", text },
      { id: assistantId, role: "assistant", text: "", streaming: true },
    ]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(text, sessionId, {
      signal: controller.signal,
      onSession: (id) => {
        setSessionId(id);
        sessionStorage.setItem(SESSION_STORAGE_KEY, id);
      },
      onToken: (chunk) => {
        updateMessage(assistantId, (m) => ({ ...m, text: m.text + chunk }));
      },
      onDone: () => {
        updateMessage(assistantId, (m) => ({ ...m, streaming: false }));
        setIsStreaming(false);
        if (wasNewSession) setRefreshSignal((n) => n + 1);
      },
      onError: (message) => {
        updateMessage(assistantId, (m) => ({
          ...m,
          text: m.text || `⚠️ ${message}`,
          streaming: false,
        }));
        setIsStreaming(false);
      },
    });
  }

  function handleNewChat() {
    abortRef.current?.abort();
    setSessionId(null);
    setMessages([]);
    setIsStreaming(false);
    setIsRestoringHistory(false);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  function handleSelectSession(id, history) {
    abortRef.current?.abort();
    setSessionId(id);
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    setMessages(messagesFromHistory(history));
    setIsStreaming(false);
    setIsRestoringHistory(false);
  }

  return (
    <div className="chat-layout">
      <Sidebar
        currentSessionId={sessionId}
        refreshSignal={refreshSignal}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />
      <div className="chat">
        {isRestoringHistory ? (
          <div className="message-list" aria-busy="true" aria-label="Loading conversation">
            <div className="message-skeleton message-skeleton-user skeleton" />
            <div className="message-skeleton message-skeleton-assistant skeleton" />
            <div className="message-skeleton message-skeleton-user skeleton" />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        <ChatInput onSend={handleSend} disabled={isStreaming || isRestoringHistory} />
      </div>
    </div>
  );
}
