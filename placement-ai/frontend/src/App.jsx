import { useState } from "react";
import { ChatIcon, CodeIcon, MicIcon, ResumeIcon, RoadmapIcon } from "./components/NavIcons";
import Chat from "./components/Chat";
import ResumeGenerator from "./pages/ResumeGenerator";
import RoadmapGenerator from "./pages/RoadmapGenerator";
import TechnicalInterview from "./pages/TechnicalInterview";
import MockInterview from "./pages/MockInterview";
import "./App.css";

const NAV_ITEMS = [
  { key: "chat", label: "Chat", Icon: ChatIcon },
  { key: "resume", label: "Resume", Icon: ResumeIcon },
  { key: "roadmap", label: "Roadmap", Icon: RoadmapIcon },
  { key: "interview", label: "Technical Interview", Icon: CodeIcon },
  { key: "mock-interview", label: "Mock Interview", Icon: MicIcon },
];

export default function App() {
  const [page, setPage] = useState("chat"); // "chat" | "resume" | "roadmap" | "interview" | "mock-interview"

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="beacon beacon--accent" aria-hidden="true" />
          <span className="rail-brand-name">PlacementAI</span>
        </div>

        <nav className="rail-nav">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                type="button"
                className={`rail-nav-item${isActive ? " active" : ""}`}
                onClick={() => setPage(key)}
              >
                <span
                  className={`beacon beacon--accent rail-nav-dot${isActive ? "" : " rail-nav-dot--hidden"}`}
                  aria-hidden="true"
                />
                <Icon className="rail-nav-icon" width={18} height={18} />
                <span className="rail-nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="app-main">
        {page === "chat" && <Chat />}
        {page === "resume" && <ResumeGenerator />}
        {page === "roadmap" && <RoadmapGenerator />}
        {page === "interview" && <TechnicalInterview />}
        {page === "mock-interview" && <MockInterview />}
      </main>
    </div>
  );
}
