import { useRef, useState } from "react";
import { motion } from "framer-motion";
// html2canvas-pro (not plain html2canvas) - the app's CSS uses color-mix()
// for box-shadows/borders, which Chrome resolves to a `color(srgb ...)`
// function at computed-style time. Plain html2canvas doesn't parse that
// function and throws; the -pro fork does.
import html2canvas from "html2canvas-pro";
import { GripIcon } from "./NavIcons";

function fileNameFor(targetRole) {
  const cleaned = (targetRole || "Roadmap").trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  return `${cleaned || "Roadmap"}_Roadmap.jpg`;
}

// Initial-render entrance only, deliberately not re-keyed on reorder - a
// dragged phase card just moves, it doesn't replay the fade+slide-in (that
// would read as content re-appearing, not a reorder).
const PHASE_STAGGER_SECONDS = 0.1;

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
  const [downloading, setDownloading] = useState(false);
  const dragFromRef = useRef(null);
  const timelineRef = useRef(null);

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

  async function handleDownloadJpg() {
    if (!timelineRef.current || downloading) return;
    setDownloading(true);
    try {
      const node = timelineRef.current;
      // Same over-capture-then-pin trick as the resume PDF export - render
      // against the node's own size so nothing gets clipped against the
      // browser viewport width.
      const width = node.scrollWidth + 2;
      const height = node.scrollHeight + 2;
      // The header text (role + duration) has no background of its own -
      // it's styled to sit on the page's <html> background (dark by
      // default, light in light mode), so the export needs to use that same
      // color rather than a hardcoded white, or that text renders unreadably
      // faint against it.
      const pageBackground = getComputedStyle(document.documentElement).backgroundColor;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: pageBackground,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = fileNameFor(targetRole);
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="resume-page">
      <div className="roadmap-toolbar">
        <button type="button" className="add-button" onClick={onEditForm}>
          ← Edit form
        </button>
        <button
          type="button"
          className={`resume-download-button${downloading ? " btn-loading" : ""}`}
          onClick={handleDownloadJpg}
          disabled={downloading}
          aria-busy={downloading}
        >
          Download JPG
        </button>
      </div>

      <div className="roadmap-timeline-wrapper" ref={timelineRef}>
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
            const isLast = position === order.length - 1;
            return (
              <motion.li
                className={`roadmap-phase${stateClass ? ` ${stateClass}` : ""}`}
                key={`${phase.phase_title}-${phaseIndex}`}
                onDragEnter={() => handleDragEnter(position)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(position)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: position * PHASE_STAGGER_SECONDS, ease: "easeOut" }}
              >
                <span className="roadmap-phase-marker beacon beacon--accent" aria-hidden="true" />
                {!isLast && (
                  // The connector "draws" downward from the marker after the
                  // phase itself has faded in, rather than the line just
                  // being there instantly - transformOrigin: top is what
                  // makes scaleY read as growing down instead of from the
                  // middle.
                  <motion.span
                    className="roadmap-phase-line"
                    aria-hidden="true"
                    style={{ transformOrigin: "top" }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      duration: 0.35,
                      delay: position * PHASE_STAGGER_SECONDS + 0.2,
                      ease: "easeOut",
                    }}
                  />
                )}
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
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
