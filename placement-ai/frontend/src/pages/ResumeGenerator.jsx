import { useState } from "react";
import { submitResumeDraft } from "../api/resume";
import ResumePreview from "../components/ResumePreview";
import { saveResumeResult } from "../lib/resumeStorage";

let nextKey = 1;

function emptyEducation() {
  return { key: nextKey++, degree: "", institution: "", year: "", gpa: "" };
}

function emptyExperience() {
  return { key: nextKey++, title: "", company: "", duration: "", bulletsText: "" };
}

function emptyProject() {
  return { key: nextKey++, name: "", description: "", techStackText: "", link: "" };
}

// Turn a repeatable-section list into the {field: value, ...} shape the
// backend expects, dropping the client-only `key` used for React lists.
function stripKey({ key: _key, ...rest }) {
  return rest;
}

export default function ResumeGenerator() {
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    location: "",
  });
  const [education, setEducation] = useState([emptyEducation()]);
  const [experience, setExperience] = useState([emptyExperience()]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [projects, setProjects] = useState([emptyProject()]);

  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [resumeResult, setResumeResult] = useState(null);

  function updatePersonalInfo(field, value) {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  }

  function updateListItem(setList, itemKey, field, value) {
    setList((prev) => prev.map((item) => (item.key === itemKey ? { ...item, [field]: value } : item)));
  }

  function addListItem(setList, makeEmpty) {
    setList((prev) => [...prev, makeEmpty()]);
  }

  function removeListItem(setList, itemKey) {
    setList((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== itemKey) : prev));
  }

  function addSkill() {
    const trimmed = skillInput.trim().replace(/,$/, "");
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  function handleSkillInputKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    } else if (e.key === "Backspace" && skillInput === "" && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function removeSkill(skill) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Flush whatever's still sitting in the skill input as one last tag.
    const finalSkills = skillInput.trim()
      ? [...skills, skillInput.trim()].filter((s, i, arr) => arr.indexOf(s) === i)
      : skills;

    const payload = {
      personal_info: personalInfo,
      education: education.map(stripKey),
      experience: experience.map(({ bulletsText, ...rest }) => ({
        ...rest,
        bullets: bulletsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      })),
      skills: finalSkills,
      projects: projects.map(({ techStackText, ...rest }) => ({
        ...rest,
        tech_stack: techStackText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      })),
    };

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await submitResumeDraft(payload);
      setResumeResult(response);
      saveResumeResult(response);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  }

  if (resumeResult) {
    return (
      <ResumePreview
        resumeData={resumeResult}
        onEditForm={() => {
          setResumeResult(null);
          setStatus("idle");
        }}
      />
    );
  }

  return (
    <form className="resume-form resume-page" onSubmit={handleSubmit}>
      <section className="resume-section">
        <h2>Personal Info</h2>
        <div className="resume-grid">
          <label>
            Name
            <input
              type="text"
              value={personalInfo.name}
              onChange={(e) => updatePersonalInfo("name", e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={personalInfo.email}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
              required
            />
          </label>
          <label>
            Phone
            <input
              type="text"
              value={personalInfo.phone}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
            />
          </label>
          <label>
            LinkedIn
            <input
              type="text"
              value={personalInfo.linkedin}
              onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
            />
          </label>
          <label>
            Location
            <input
              type="text"
              value={personalInfo.location}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="resume-section">
        <div className="resume-section-header">
          <h2>Education</h2>
          <button type="button" className="add-button" onClick={() => addListItem(setEducation, emptyEducation)}>
            + Add education
          </button>
        </div>
        {education.map((entry, i) => (
          <div className="resume-repeatable" key={entry.key}>
            <div className="resume-repeatable-header">
              <span>Entry {i + 1}</span>
              <button
                type="button"
                className="remove-button"
                onClick={() => removeListItem(setEducation, entry.key)}
                disabled={education.length === 1}
              >
                Remove
              </button>
            </div>
            <div className="resume-grid">
              <label>
                Degree
                <input
                  type="text"
                  value={entry.degree}
                  onChange={(e) => updateListItem(setEducation, entry.key, "degree", e.target.value)}
                />
              </label>
              <label>
                Institution
                <input
                  type="text"
                  value={entry.institution}
                  onChange={(e) => updateListItem(setEducation, entry.key, "institution", e.target.value)}
                />
              </label>
              <label>
                Year
                <input
                  type="text"
                  value={entry.year}
                  onChange={(e) => updateListItem(setEducation, entry.key, "year", e.target.value)}
                />
              </label>
              <label>
                GPA
                <input
                  type="text"
                  value={entry.gpa}
                  onChange={(e) => updateListItem(setEducation, entry.key, "gpa", e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
      </section>

      <section className="resume-section">
        <div className="resume-section-header">
          <h2>Experience</h2>
          <button type="button" className="add-button" onClick={() => addListItem(setExperience, emptyExperience)}>
            + Add experience
          </button>
        </div>
        {experience.map((entry, i) => (
          <div className="resume-repeatable" key={entry.key}>
            <div className="resume-repeatable-header">
              <span>Role {i + 1}</span>
              <button
                type="button"
                className="remove-button"
                onClick={() => removeListItem(setExperience, entry.key)}
                disabled={experience.length === 1}
              >
                Remove
              </button>
            </div>
            <div className="resume-grid">
              <label>
                Title
                <input
                  type="text"
                  value={entry.title}
                  onChange={(e) => updateListItem(setExperience, entry.key, "title", e.target.value)}
                />
              </label>
              <label>
                Company
                <input
                  type="text"
                  value={entry.company}
                  onChange={(e) => updateListItem(setExperience, entry.key, "company", e.target.value)}
                />
              </label>
              <label>
                Duration
                <input
                  type="text"
                  value={entry.duration}
                  onChange={(e) => updateListItem(setExperience, entry.key, "duration", e.target.value)}
                  placeholder="May 2025 - Aug 2025"
                />
              </label>
            </div>
            <label className="resume-full-width">
              Bullet notes (one per line - raw notes are fine, we'll polish them later)
              <textarea
                rows={4}
                value={entry.bulletsText}
                onChange={(e) => updateListItem(setExperience, entry.key, "bulletsText", e.target.value)}
                placeholder={"Built X that improved Y by Z%\nOwned end-to-end delivery of ..."}
              />
            </label>
          </div>
        ))}
      </section>

      <section className="resume-section">
        <h2>Skills</h2>
        <div className="skill-input-row">
          {skills.map((skill) => (
            <span className="skill-tag" key={skill}>
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            className="skill-input"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillInputKeyDown}
            onBlur={addSkill}
            placeholder="Type a skill, press Enter or , to add"
          />
        </div>
      </section>

      <section className="resume-section">
        <div className="resume-section-header">
          <h2>Projects</h2>
          <button type="button" className="add-button" onClick={() => addListItem(setProjects, emptyProject)}>
            + Add project
          </button>
        </div>
        {projects.map((entry, i) => (
          <div className="resume-repeatable" key={entry.key}>
            <div className="resume-repeatable-header">
              <span>Project {i + 1}</span>
              <button
                type="button"
                className="remove-button"
                onClick={() => removeListItem(setProjects, entry.key)}
                disabled={projects.length === 1}
              >
                Remove
              </button>
            </div>
            <div className="resume-grid">
              <label>
                Name
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateListItem(setProjects, entry.key, "name", e.target.value)}
                />
              </label>
              <label>
                Link
                <input
                  type="text"
                  value={entry.link}
                  onChange={(e) => updateListItem(setProjects, entry.key, "link", e.target.value)}
                  placeholder="github.com/you/project"
                />
              </label>
              <label>
                Tech stack (comma-separated)
                <input
                  type="text"
                  value={entry.techStackText}
                  onChange={(e) => updateListItem(setProjects, entry.key, "techStackText", e.target.value)}
                  placeholder="React, FastAPI, SQLite"
                />
              </label>
            </div>
            <label className="resume-full-width">
              Description
              <textarea
                rows={3}
                value={entry.description}
                onChange={(e) => updateListItem(setProjects, entry.key, "description", e.target.value)}
              />
            </label>
          </div>
        ))}
      </section>

      <div className="resume-submit-row">
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Polishing with AI..." : "Submit draft"}
        </button>
        {status === "error" && <span className="resume-status resume-status-error">⚠️ {errorMessage}</span>}
      </div>
    </form>
  );
}
