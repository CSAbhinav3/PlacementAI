import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { runCode, submitCode } from "../api/execute";
import { getProblem, listProblems } from "../api/problems";
import { useTheme } from "../theme";

const DIFFICULTY_ORDER = ["Easy", "Medium", "Hard"];
const ALL = "all";

function verdictClass(verdict) {
  return `interview-verdict-${verdict.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function TechnicalInterview() {
  const { theme } = useTheme();
  const [problems, setProblems] = useState([]);
  const [listError, setListError] = useState("");

  // Filtering happens entirely client-side against the already-fetched
  // list - see api/problems.js. "all" means the filter is inactive.
  const [topicFilter, setTopicFilter] = useState(ALL);
  const [difficultyFilter, setDifficultyFilter] = useState(ALL);
  const [companyFilter, setCompanyFilter] = useState(ALL);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle"); // idle | loading | error
  const [detailError, setDetailError] = useState("");

  const [code, setCode] = useState("");

  const [runStatus, setRunStatus] = useState("idle"); // idle | running
  const [runError, setRunError] = useState("");
  const [runResult, setRunResult] = useState(null);

  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | submitting
  const [submitError, setSubmitError] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    listProblems()
      .then(setProblems)
      .catch((err) => setListError(err.message));
  }, []);

  const topics = useMemo(
    () => [...new Set(problems.map((p) => p.topic))].sort((a, b) => a.localeCompare(b)),
    [problems],
  );
  const companies = useMemo(
    () => [...new Set(problems.flatMap((p) => p.companies))].sort((a, b) => a.localeCompare(b)),
    [problems],
  );
  const difficulties = useMemo(
    () => DIFFICULTY_ORDER.filter((d) => problems.some((p) => p.difficulty === d)),
    [problems],
  );

  const filteredProblems = useMemo(
    () =>
      problems.filter(
        (p) =>
          (topicFilter === ALL || p.topic === topicFilter) &&
          (difficultyFilter === ALL || p.difficulty === difficultyFilter) &&
          (companyFilter === ALL || p.companies.includes(companyFilter)),
      ),
    [problems, topicFilter, difficultyFilter, companyFilter],
  );

  async function selectProblem(id) {
    setSelectedId(id);
    setDetailStatus("loading");
    setDetailError("");
    setRunResult(null);
    setRunError("");
    setSubmitResult(null);
    setSubmitError("");
    try {
      const data = await getProblem(id);
      setDetail(data);
      setCode(data.stub);
      setDetailStatus("idle");
    } catch (err) {
      setDetailError(err.message);
      setDetailStatus("error");
    }
  }

  async function handleRun() {
    if (!selectedId || runStatus === "running") return;
    setRunStatus("running");
    setRunError("");
    setRunResult(null);
    try {
      const data = await runCode(selectedId, code);
      setRunResult(data);
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunStatus("idle");
    }
  }

  async function handleSubmit() {
    if (!selectedId || submitStatus === "submitting") return;
    setSubmitStatus("submitting");
    setSubmitError("");
    setSubmitResult(null);
    try {
      const data = await submitCode(selectedId, code);
      setSubmitResult(data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitStatus("idle");
    }
  }

  return (
    <div className="interview-layout">
      <div className="interview-sidebar">
        <div className="interview-filters">
          <label>
            Topic
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value={ALL}>All topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
              <option value={ALL}>All difficulties</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </label>
          <label>
            Company
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value={ALL}>All companies</option>
              {companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </label>
        </div>

        <aside className="interview-problem-list">
          {listError && <p className="resume-status resume-status-error">⚠️ {listError}</p>}
          {!listError && problems.length > 0 && filteredProblems.length === 0 && (
            <p className="interview-filters-empty">No problems match these filters.</p>
          )}
          {filteredProblems.map((problem) => (
            <button
              key={problem.id}
              type="button"
              className={`interview-problem-item${problem.id === selectedId ? " active" : ""}`}
              onClick={() => selectProblem(problem.id)}
            >
              <span className="interview-problem-item-row">
                <span>{problem.title}</span>
                <span className={`interview-difficulty interview-difficulty-${problem.difficulty.toLowerCase()}`}>
                  {problem.difficulty}
                </span>
              </span>
              <span className="interview-problem-topic">{problem.topic}</span>
            </button>
          ))}
        </aside>
      </div>

      <section className="interview-detail">
        {detailStatus === "loading" && (
          <div className="interview-detail-skeleton" aria-busy="true" aria-label="Loading problem">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
        {detailStatus === "error" && <p className="resume-status resume-status-error">⚠️ {detailError}</p>}
        {detailStatus === "idle" && !detail && (
          <p className="interview-detail-empty">Select a problem from the list to see its details.</p>
        )}
        {detailStatus === "idle" && detail && (
          <>
            <div className="interview-detail-header">
              <h2>{detail.title}</h2>
              <span className={`interview-difficulty interview-difficulty-${detail.difficulty.toLowerCase()}`}>
                {detail.difficulty}
              </span>
            </div>

            <div className="interview-detail-meta">
              <span className="mono-label">{detail.topic}</span>
              {detail.companies.length > 0 && (
                <span className="interview-detail-companies">Asked at: {detail.companies.join(", ")}</span>
              )}
            </div>

            <div className="interview-detail-section">
              <p>{detail.description}</p>
            </div>

            {detail.constraints?.length > 0 && (
              <div className="interview-detail-section">
                <h3>Constraints</h3>
                <ul className="interview-constraints">
                  {detail.constraints.map((constraint, i) => (
                    <li key={i}>{constraint}</li>
                  ))}
                </ul>
              </div>
            )}

            {detail.examples?.length > 0 && (
              <div className="interview-detail-section">
                <h3>Examples</h3>
                {detail.examples.map((example, i) => (
                  <div className="interview-example" key={i}>
                    <div>
                      <strong>Input:</strong> <code>{example.input}</code>
                    </div>
                    <div>
                      <strong>Output:</strong> <code>{example.output}</code>
                    </div>
                    {example.explanation && <p className="interview-example-explanation">{example.explanation}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="interview-editor-section">
              <h3>Solution</h3>
              <div className="interview-editor-wrapper">
                <Editor
                  height="320px"
                  language="python"
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  value={code}
                  onChange={(value) => setCode(value ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              <div className="resume-submit-row">
                <button
                  type="button"
                  className={runStatus === "running" ? "btn-loading" : undefined}
                  onClick={handleRun}
                  disabled={runStatus === "running"}
                  aria-busy={runStatus === "running"}
                >
                  Run
                </button>
                <button
                  type="button"
                  className={submitStatus === "submitting" ? "btn-loading" : undefined}
                  onClick={handleSubmit}
                  disabled={submitStatus === "submitting"}
                  aria-busy={submitStatus === "submitting"}
                >
                  Submit
                </button>
              </div>

              {runError && <p className="resume-status resume-status-error">⚠️ {runError}</p>}

              {runResult && (
                <div className="interview-results">
                  {runResult.error && <p className="resume-status resume-status-error">⚠️ {runResult.error}</p>}
                  {runResult.results.map((result, i) => (
                    <div className={`interview-test-result ${result.passed ? "pass" : "fail"}`} key={i}>
                      <div className="interview-test-result-header">
                        <span>Test {i + 1}</span>
                        <span>{result.passed ? "Passed" : "Failed"}</span>
                      </div>
                      <div className="interview-test-result-row">
                        <strong>Input:</strong> <code>{result.input}</code>
                      </div>
                      <div className="interview-test-result-row">
                        <strong>Expected:</strong> <code>{result.expected_output}</code>
                      </div>
                      <div className="interview-test-result-row">
                        <strong>Actual:</strong> <code>{result.actual_output ?? "(none)"}</code>
                      </div>
                      {result.stderr && <div className="interview-test-result-stderr">{result.stderr}</div>}
                    </div>
                  ))}
                </div>
              )}

              {submitError && <p className="resume-status resume-status-error">⚠️ {submitError}</p>}

              {submitResult && (
                // No AnimatePresence/key needed for the entrance to replay on
                // each submit - handleSubmit sets submitResult back to null
                // before the new result arrives, so this genuinely unmounts
                // and remounts every time rather than just updating in place.
                <motion.div
                  className={`interview-verdict ${verdictClass(submitResult.verdict)}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <span className="interview-verdict-label">
                    <motion.span
                      className="interview-verdict-dot"
                      aria-hidden="true"
                      initial={{ scale: 0.6 }}
                      animate={{ scale: [0.6, 1.6, 1] }}
                      transition={{ duration: 0.5, delay: 0.15, times: [0, 0.6, 1], ease: "easeOut" }}
                    />
                    {submitResult.verdict}
                  </span>
                  <span className="interview-verdict-count">
                    {submitResult.passed_count} / {submitResult.total_count} passed
                  </span>
                </motion.div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
