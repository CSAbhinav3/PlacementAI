import { useEffect, useRef, useState } from "react";
import { endInterview, respondToInterview, startInterview } from "../api/interview";

const TYPE_LABELS = {
  behavioral: "Behavioral",
  technical: "Technical",
};

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function voiceErrorMessage(code) {
  switch (code) {
    case "no-speech":
      return "No speech detected. Please try again.";
    case "audio-capture":
      return "No microphone was found. Please check your device.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was denied. Please allow microphone permission and try again.";
    case "network":
      return "A network error interrupted voice recognition. Please try again.";
    case "aborted":
      // Fires on our own recognition.stop() calls too - not a real error.
      return "";
    default:
      return "Voice input failed. Please try again, or type your answer instead.";
  }
}

export default function MockInterview() {
  const [phase, setPhase] = useState("start"); // "start" | "active" | "ended"
  const [interviewType, setInterviewType] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [transcript, setTranscript] = useState([]); // [{role: "interviewer" | "candidate", text}]
  const [answer, setAnswer] = useState("");
  const [summary, setSummary] = useState("");

  const [status, setStatus] = useState("idle"); // idle | starting | sending | ending
  const [errorMessage, setErrorMessage] = useState("");

  // Text-to-speech: speaks each new interviewer question aloud.
  const [ttsSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech-to-text: dictates into the answer input (never auto-submits).
  const [speechRecognitionSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
      setVoiceError("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setAnswer((prev) => (prev ? `${prev} ${final}` : final).trim());
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      const message = voiceErrorMessage(event.error);
      if (message) setVoiceError(message);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  // Stop any speech/listening still running when the page is left.
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  function speak(text) {
    if (muted || !ttsSupported) return;
    window.speechSynthesis.cancel(); // don't overlap with a still-playing utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function handleToggleMute() {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      }
      return next;
    });
  }

  function handleMicClick() {
    const recognition = recognitionRef.current;
    if (!recognition || status !== "idle") return;

    if (listening) {
      recognition.stop();
      return;
    }

    setVoiceError("");
    try {
      recognition.start();
    } catch {
      // Thrown synchronously if start() is called while already active, or
      // in some browsers if mic access was previously blocked outright.
      setVoiceError("Could not start voice input. Please try again.");
    }
  }

  async function handleStart(type) {
    if (status === "starting") return;
    setStatus("starting");
    setErrorMessage("");
    try {
      const data = await startInterview(type);
      setInterviewType(type);
      setSessionId(data.session_id);
      setTranscript([{ role: "interviewer", text: data.question }]);
      setPhase("active");
      speak(data.question);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setStatus("idle");
    }
  }

  async function handleSubmitAnswer(e) {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || status !== "idle") return;

    recognitionRef.current?.stop();
    setTranscript((prev) => [...prev, { role: "candidate", text: trimmed }]);
    setAnswer("");
    setStatus("sending");
    setErrorMessage("");

    try {
      const data = await respondToInterview(sessionId, trimmed);
      setTranscript((prev) => [...prev, { role: "interviewer", text: data.question }]);
      speak(data.question);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setStatus("idle");
    }
  }

  async function handleEnd() {
    if (status !== "idle") return;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setStatus("ending");
    setErrorMessage("");
    try {
      const data = await endInterview(sessionId);
      setSummary(data.summary);
      setPhase("ended");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setStatus("idle");
    }
  }

  function handleRestart() {
    setPhase("start");
    setInterviewType(null);
    setSessionId(null);
    setTranscript([]);
    setAnswer("");
    setSummary("");
    setErrorMessage("");
  }

  if (phase === "start") {
    return (
      <div className="mock-interview-page mock-interview-start">
        <h2>Mock Interview</h2>
        <p className="mock-interview-subtitle">Choose an interview type to begin.</p>
        <div className="mock-interview-type-buttons">
          <button
            type="button"
            className={`add-button mock-interview-cta${status === "starting" ? " btn-loading" : ""}`}
            onClick={() => handleStart("behavioral")}
            disabled={status === "starting"}
          >
            Behavioral
          </button>
          <button
            type="button"
            className={`add-button mock-interview-cta${status === "starting" ? " btn-loading" : ""}`}
            onClick={() => handleStart("technical")}
            disabled={status === "starting"}
          >
            Technical
          </button>
        </div>
        {errorMessage && <p className="resume-status resume-status-error">⚠️ {errorMessage}</p>}
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="mock-interview-page">
        <div className="mock-interview-summary">
          <h2>Interview Summary</h2>
          <p className="mock-interview-summary-type">{TYPE_LABELS[interviewType]} interview</p>
          <pre className="mock-interview-summary-text">{summary}</pre>
          <button type="button" className="add-button" onClick={handleRestart}>
            Start another interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mock-interview-page">
      <div className="mock-interview-header">
        <span className="mock-interview-type-label">{TYPE_LABELS[interviewType]} Interview</span>
        <div className="mock-interview-header-actions">
          {isSpeaking && <span className="mock-interview-speaking">🔊 Speaking...</span>}
          {ttsSupported && (
            <button type="button" className="add-button" onClick={handleToggleMute}>
              {muted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
          )}
          <button
            type="button"
            className={`add-button${status === "ending" ? " btn-loading" : ""}`}
            onClick={handleEnd}
            disabled={status === "ending"}
          >
            End Interview
          </button>
        </div>
      </div>

      <div className="chat">
        <div className="message-list">
          {transcript.map((turn, i) => (
            <div key={i} className={`message message-${turn.role === "interviewer" ? "assistant" : "user"}`}>
              <span className="message-role">{turn.role === "interviewer" ? "Interviewer" : "You"}</span>
              <p className="message-text">{turn.text}</p>
            </div>
          ))}
          {status === "sending" && (
            <div className="message message-assistant" aria-live="polite" aria-label="Interviewer is responding">
              <span className="message-role">Interviewer</span>
              <div className="typing-indicator">
                <span className="beacon beacon--accent" aria-hidden="true" />
                <span className="beacon beacon--accent" aria-hidden="true" />
                <span className="beacon beacon--accent" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        <form className="chat-input" onSubmit={handleSubmitAnswer}>
          {speechRecognitionSupported && (
            <button
              type="button"
              className={`mock-interview-mic-button${listening ? " listening" : ""}`}
              onClick={handleMicClick}
              disabled={status !== "idle"}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              title={listening ? "Stop voice input" : "Start voice input"}
            >
              {listening ? "⏹️" : "🎙️"}
            </button>
          )}
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={listening ? "Listening..." : "Type your answer..."}
            disabled={status !== "idle"}
            autoFocus
          />
          <button type="submit" disabled={status !== "idle" || !answer.trim()}>
            Send
          </button>
        </form>

        {!speechRecognitionSupported && (
          <p className="mock-interview-voice-unsupported">
            Voice input isn't supported in this browser - please type your answer instead.
          </p>
        )}
        {listening && interimTranscript && <p className="mock-interview-interim">{interimTranscript}</p>}
        {voiceError && <p className="resume-status resume-status-error">⚠️ {voiceError}</p>}
      </div>

      {errorMessage && <p className="resume-status resume-status-error">⚠️ {errorMessage}</p>}
    </div>
  );
}
