import { useRef, useState } from "react";
import { GripIcon } from "./NavIcons";

// Checked state is purely visual progress tracking - it lives in this
// component's state only and is never sent anywhere or persisted. Re-running
// the form (or reloading) starts every milestone unchecked again.
//
// Phase order is the same story: `order` is a permutation of the original
// phase indices, so dragging a phase card just reshuffles that array. Both
// `phases` and `checked` stay indexed by the AI's original ordering, which
// means a milestone's checked box always follows its own phase around when
// the phase is dragged - no re-indexing needed.

export default function RoadmapTimeline({ roadmapData, onEditForm }) {
  const { target_role: targetRole, total_duration: totalDuration, phases } = roadmapData;

  const [checked, setChecked] = useState(() => phases.map((phase) => phase.milestones.map(() => false)));
  const [order, setOrder] = useState(() => phases.map((_, i) => i));
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragFromRef = useRef(null);

  function toggleMilestone(phaseIndex, milestoneIndex) {
    setChecked((prev) => {
      const next = prev.map((phaseChecks) => [...phaseChecks]);
      next[phaseIndex][milestoneIndex] = !next[phaseIndex][milestoneIndex];
      return next;
    });
  }

  function handleDragStart(position) {
    dragFromRef.current = position;
    setDragIndex(position);
  }

  function handleDragEnter(position) {
    if (dragFromRef.current === null || position === dragFromRef.current) return;
    setDragOverIndex(position);
  }

  function handleDrop(position) {
    const from = dragFromRef.current;
    if (from === null || from === position) {
      resetDrag();
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(position, 0, moved);
      return next;
    });
    resetDrag();
  }

  function resetDrag() {
    dragFromRef.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
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
          {order.map((phaseIndex, position) => {
            const phase = phases[phaseIndex];
            const stateClass = [
              dragIndex === position ? "dragging" : "",
              dragOverIndex === position ? "drag-over" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                className={`roadmap-phase${stateClass ? ` ${stateClass}` : ""}`}
                key={`${phase.phase_title}-${phaseIndex}`}
                onDragEnter={() => handleDragEnter(position)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(position)}
              >
                <span className="roadmap-phase-marker" aria-hidden="true" />
                <div className="roadmap-phase-card">
                  <div className="roadmap-phase-header">
                    <h2>
                      <span
                        className="roadmap-phase-drag-handle"
                        draggable
                        onDragStart={() => handleDragStart(position)}
                        onDragEnd={resetDrag}
                        title="Drag to reorder"
                        aria-label={`Reorder ${phase.phase_title}`}
                      >
                        <GripIcon width={14} height={14} />
                      </span>
                      {phase.phase_title}
                    </h2>
                    <span className="roadmap-phase-duration">{phase.duration_label}</span>
                  </div>
                  <p className="roadmap-phase-focus">{phase.focus_summary}</p>
                  {phase.milestones.length > 0 && (
                    <ul className="roadmap-milestones">
                      {phase.milestones.map((milestone, j) => {
                        const inputId = `roadmap-phase${phaseIndex}-milestone${j}`;
                        const done = checked[phaseIndex]?.[j] ?? false;
                        return (
                          <li className="roadmap-milestone" key={j}>
                            <input
                              type="checkbox"
                              id={inputId}
                              checked={done}
                              onChange={() => toggleMilestone(phaseIndex, j)}
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
            );
          })}
        </ol>
      </div>
    </div>
  );
}
