import { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
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
                {isActive ? (
                  // layoutId is the whole trick: framer-motion snapshots this
                  // element's position before/after the render that moves it
                  // to a different nav item and animates the delta (a FLIP
                  // shared-layout transition), rather than the dot just
                  // vanishing from one item and reappearing in another.
                  <motion.span
                    layoutId="rail-active-beacon"
                    className="beacon beacon--accent rail-nav-dot"
                    aria-hidden="true"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                ) : (
                  // Inactive items keep a non-animated, invisible dot in the
                  // same spot so the label doesn't shift when the real one
                  // moves away - same box, just not the shared element.
                  <span className="beacon beacon--accent rail-nav-dot rail-nav-dot--hidden" aria-hidden="true" />
                )}
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
    // "user" mode makes every framer-motion animation in the app respect
    // prefers-reduced-motion automatically (transitions collapse to instant
    // if the OS setting is on) - one place to opt every motion.* component
    // into that instead of threading a check through each one.
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </MotionConfig>
  );
}
