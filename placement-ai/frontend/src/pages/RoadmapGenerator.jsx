import { useState } from "react";
import { generateRoadmap } from "../api/roadmap";
import { loadResumeResult } from "../lib/resumeStorage";
import RoadmapTimeline from "../components/RoadmapTimeline";

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function RoadmapGenerator() {
  const [targetRole, setTargetRole] = useState("");
  const [currentLevel, setCurrentLevel] = useState("beginner");
  const [timeframeMonths, setTimeframeMonths] = useState(3);
  const [knownSkills, setKnownSkills] = useState([]);

  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [roadmapResult, setRoadmapResult] = useState(null);

  // Checked once on mount - switching nav pages remounts this component, so
  // a resume generated after that will show up next time this page loads.
  const [importedResume] = useState(() => loadResumeResult());
  const hasResume = importedResume !== null;

  function importFromResume() {
    if (!importedResume) return;
    setKnownSkills(importedResume.skills ?? []);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      target_role: targetRole,
      current_level: currentLevel,
      timeframe_months: Number(timeframeMonths),
      known_skills: knownSkills,
    };

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await generateRoadmap(payload);
      setRoadmapResult(response);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  }

  if (roadmapResult) {
    return (
      <RoadmapTimeline
        roadmapData={roadmapResult}
        onEditForm={() => {
          setRoadmapResult(null);
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <form className="resume-form resume-page" onSubmit={handleSubmit}>
      <section className="resume-section">
        <h2>Roadmap Generator</h2>
        <div className="resume-grid">
          <label>
            Target role
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              required
            />
          </label>
          <label>
            Current level
            <select value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value)}>
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Timeframe (months)
            <input
              type="number"
              min="1"
              max="36"
              value={timeframeMonths}
              onChange={(e) => setTimeframeMonths(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="resume-full-width">
          <button
            type="button"
            className="add-button"
            onClick={importFromResume}
            disabled={!hasResume}
            title={hasResume ? undefined : "Generate a resume first to import skills"}
          >
            Import from Resume
          </button>
          {knownSkills.length > 0 && (
            <p className="roadmap-imported-skills">Imported skills: {knownSkills.join(", ")}</p>
          )}
        </div>
      </section>

      <div className="resume-submit-row">
        <button
          type="submit"
          className={status === "submitting" ? "btn-loading" : undefined}
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
        >
          Generate roadmap
        </button>
        {status === "error" && <span className="resume-status resume-status-error">⚠️ {errorMessage}</span>}
      </div>
    </form>
  );
}
