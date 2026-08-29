import { useRef, useState } from "react";
import html2pdf from "html2pdf.js";

// Editable text (bullets, project descriptions, the summary line) is
// committed to state on blur rather than on every keystroke. contentEditable
// owns the DOM text while focused; syncing state on every input would fight
// the cursor position on re-render. Committing on blur avoids that while
// still capturing edits before the user downloads the PDF - and since PDF
// export snapshots the live DOM (see handleDownloadPdf), even an edit still
// in progress (not yet blurred) is included either way.

function contactLine(personalInfo) {
  return [personalInfo.email, personalInfo.phone, personalInfo.linkedin, personalInfo.location]
    .filter(Boolean)
    .join("  |  ");
}

function fileNameFor(name) {
  const cleaned = (name || "Resume").trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  return `${cleaned || "Resume"}_Resume.pdf`;
}

export default function ResumePreview({ resumeData, onEditForm }) {
  const { personal_info: personalInfo, education, experience, skills, projects } = resumeData;

  const [summary, setSummary] = useState("");
  const [bullets, setBullets] = useState(() => experience.map((entry) => [...entry.bullets]));
  const [descriptions, setDescriptions] = useState(() => projects.map((project) => project.description));
  const [downloading, setDownloading] = useState(false);

  const previewRef = useRef(null);

  function updateBullet(expIndex, bulletIndex, text) {
    setBullets((prev) => {
      const next = prev.map((entryBullets) => [...entryBullets]);
      next[expIndex][bulletIndex] = text;
      return next;
    });
  }

  function updateDescription(projectIndex, text) {
    setDescriptions((prev) => {
      const next = [...prev];
      next[projectIndex] = text;
      return next;
    });
  }

  async function handleDownloadPdf() {
    if (!previewRef.current || downloading) return;
    setDownloading(true);
    try {
      const node = previewRef.current;
      // Pin html2canvas to the node's own pixel dimensions, with a couple
      // px of slack - otherwise it renders against window.innerWidth, which
      // clips the right edge (duration/link/year columns, flush right)
      // whenever the node is close to (but narrower than) the actual
      // browser viewport width.
      const width = node.scrollWidth + 2;
      const height = node.scrollHeight + 2;
      await html2pdf()
        .set({
          margin: 0,
          filename: fileNameFor(personalInfo.name),
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            width,
            height,
            windowWidth: width,
            windowHeight: height,
          },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(node)
        .save();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="resume-page">
      <div className="resume-preview-toolbar">
        <button type="button" className="add-button" onClick={onEditForm}>
          ← Edit form
        </button>
        <button
          type="button"
          className={`resume-download-button${downloading ? " btn-loading" : ""}`}
          onClick={handleDownloadPdf}
          disabled={downloading}
          aria-busy={downloading}
        >
          Download PDF
        </button>
      </div>

      <div className="resume-preview" ref={previewRef}>
        <header className="resume-preview-header">
          <h1>{personalInfo.name}</h1>
          {contactLine(personalInfo) && <p className="resume-preview-contact">{contactLine(personalInfo)}</p>}
        </header>

        <p
          className="resume-preview-summary"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setSummary(e.currentTarget.textContent)}
          data-placeholder="Click to add a one-line summary..."
        >
          {summary}
        </p>

        {skills.length > 0 && (
          <section className="resume-preview-section">
            <h2>Skills</h2>
            <p className="resume-preview-skills">{skills.join(", ")}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="resume-preview-section">
            <h2>Experience</h2>
            {experience.map((entry, i) => (
              <div className="resume-preview-entry" key={`${entry.title}-${i}`}>
                <div className="resume-preview-entry-header">
                  <span className="resume-preview-entry-title">
                    {entry.title}
                    {entry.company ? ` — ${entry.company}` : ""}
                  </span>
                  {entry.duration && <span className="resume-preview-entry-meta">{entry.duration}</span>}
                </div>
                {bullets[i]?.length > 0 && (
                  <ul className="resume-preview-bullets">
                    {bullets[i].map((bullet, j) => (
                      <li
                        key={j}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateBullet(i, j, e.currentTarget.textContent)}
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {projects.length > 0 && (
          <section className="resume-preview-section">
            <h2>Projects</h2>
            {projects.map((entry, i) => (
              <div className="resume-preview-entry" key={`${entry.name}-${i}`}>
                <div className="resume-preview-entry-header">
                  <span className="resume-preview-entry-title">
                    {entry.name}
                    {entry.tech_stack?.length > 0 ? ` — ${entry.tech_stack.join(", ")}` : ""}
                  </span>
                  {entry.link && <span className="resume-preview-entry-meta">{entry.link}</span>}
                </div>
                <p
                  className="resume-preview-description"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateDescription(i, e.currentTarget.textContent)}
                >
                  {descriptions[i]}
                </p>
              </div>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="resume-preview-section">
            <h2>Education</h2>
            {education.map((entry, i) => (
              <div className="resume-preview-entry" key={`${entry.degree}-${i}`}>
                <div className="resume-preview-entry-header">
                  <span className="resume-preview-entry-title">
                    {entry.degree}
                    {entry.institution ? ` — ${entry.institution}` : ""}
                    {entry.gpa ? ` (GPA: ${entry.gpa})` : ""}
                  </span>
                  {entry.year && <span className="resume-preview-entry-meta">{entry.year}</span>}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
