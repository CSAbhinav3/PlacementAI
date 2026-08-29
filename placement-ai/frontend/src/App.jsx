import { useState } from "react";
import {
  ChatIcon,
  ChevronLeftIcon,
  CodeIcon,
  MicIcon,
  MoonIcon,
  ResumeIcon,
  RoadmapIcon,
  SunIcon,
} from "./components/NavIcons";
import { ThemeProvider, useTheme } from "./theme";
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

const RAIL_COLLAPSED_KEY = "placement-ai.rail-collapsed";

function AppShell() {
  const [page, setPage] = useState("chat"); // "chat" | "resume" | "roadmap" | "interview" | "mock-interview"
  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem(RAIL_COLLAPSED_KEY) === "1",
  );
  const { theme, toggleTheme } = useTheme();

  function toggleRail() {
    setRailCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="app-shell">
      <aside className={`rail${railCollapsed ? " collapsed" : ""}`}>
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
                title={railCollapsed ? label : undefined}
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

        <div className="rail-footer">
          <button
            type="button"
            className="rail-footer-button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
            <span className="rail-nav-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            type="button"
            className="rail-footer-button rail-collapse-button"
            onClick={toggleRail}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeftIcon width={16} height={16} className={railCollapsed ? "flipped" : undefined} />
            <span className="rail-nav-label">Collapse</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div key={page} className="page-transition">
          {page === "chat" && <Chat />}
          {page === "resume" && <ResumeGenerator />}
          {page === "roadmap" && <RoadmapGenerator />}
          {page === "interview" && <TechnicalInterview />}
          {page === "mock-interview" && <MockInterview />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
