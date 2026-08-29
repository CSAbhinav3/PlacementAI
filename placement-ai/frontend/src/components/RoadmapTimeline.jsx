import { useState } from "react";

// Checked state is purely visual progress tracking - it lives in this
// component's state only and is never sent anywhere or persisted. Re-running
// the form (or reloading) starts every milestone unchecked again.

export default function RoadmapTimeline({ roadmapData, onEditForm }) {
  const { target_role: targetRole, total_duration: totalDuration, phases } = roadmapData;

  const [checked, setChecked] = useState(() => phases.map((phase) => phase.milestones.map(() => false)));

  function toggleMilestone(phaseIndex, milestoneIndex) {
    setChecked((prev) => {
      const next = prev.map((phaseChecks) => [...phaseChecks]);
      next[phaseIndex][milestoneIndex] = !next[phaseIndex][milestoneIndex];
      return next;
    });
  }

  return (
    <div className="resume-page">
      <div className="roadmap-toolbar">
        <button type="button" className="add-button" onClick={onEditForm}>
          ← Edit form
        </button>
      </div>

      <div className="roadmap-timeline-wrapper">
        <header className="roadmap-timeline-header">
          <h1>{targetRole}</h1>
          <p className="roadmap-timeline-duration">{totalDuration}</p>
        </header>

        <ol className="roadmap-timeline">
          {phases.map((phase, i) => (
            <li className="roadmap-phase" key={`${phase.phase_title}-${i}`}>
              <span className="roadmap-phase-marker" aria-hidden="true" />
              <div className="roadmap-phase-card">
                <div className="roadmap-phase-header">
                  <h2>{phase.phase_title}</h2>
                  <span className="roadmap-phase-duration">{phase.duration_label}</span>
                </div>
                <p className="roadmap-phase-focus">{phase.focus_summary}</p>
                {phase.milestones.length > 0 && (
                  <ul className="roadmap-milestones">
                    {phase.milestones.map((milestone, j) => {
                      const inputId = `roadmap-phase${i}-milestone${j}`;
                      const done = checked[i]?.[j] ?? false;
                      return (
                        <li className="roadmap-milestone" key={j}>
                          <input
                            type="checkbox"
                            id={inputId}
                            checked={done}
                            onChange={() => toggleMilestone(i, j)}
                          />
                          <label htmlFor={inputId} className={done ? "roadmap-milestone-done" : undefined}>
                            {milestone}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
