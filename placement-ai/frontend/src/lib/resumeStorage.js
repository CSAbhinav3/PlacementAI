const STORAGE_KEY = "placementai:resumeResult";

/**
 * Persist the latest generated resume (the post-AI-polish ResumeData
 * response) so other modules - e.g. the Roadmap Generator's "Import from
 * Resume" - can read it back without lifting resume state up into App.
 * Session-scoped storage matches "if a resume was generated this session".
 */
export function saveResumeResult(resumeData) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  } catch {
    // sessionStorage can throw (private browsing, quota, disabled storage).
    // Importing skills into the roadmap form is a convenience, not
    // critical, so just skip persisting rather than breaking submission.
  }
}

/** Returns the last-saved resume result, or null if none exists yet. */
export function loadResumeResult() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
