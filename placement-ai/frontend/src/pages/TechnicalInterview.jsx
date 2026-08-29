import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { runCode, submitCode } from "../api/execute";
import { getProblem, listProblems } from "../api/problems";

function verdictClass(verdict) {
  return `interview-verdict-${verdict.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function TechnicalInterview() {
  const [problems, setProblems] = useState([]);
  const [listError, setListError] = useState("");

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
      <aside className="interview-problem-list">
        {listError && <p className="resume-status resume-status-error">⚠️ {listError}</p>}
        {problems.map((problem) => (
          <button
            key={problem.id}
            type="button"
            className={`interview-problem-item${problem.id === selectedId ? " active" : ""}`}
            onClick={() => selectProblem(problem.id)}
          >
            <span>{problem.title}</span>
            <span className={`interview-difficulty interview-difficulty-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
          </button>
        ))}
      </aside>

      <section className="interview-detail">
        {detailStatus === "loading" && <p className="interview-detail-empty">Loading...</p>}
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
                  theme="vs-dark"
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
                <button type="button" onClick={handleRun} disabled={runStatus === "running"}>
                  {runStatus === "running" ? "Running..." : "Run"}
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitStatus === "submitting"}>
                  {submitStatus === "submitting" ? "Submitting..." : "Submit"}
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
                <div className={`interview-verdict ${verdictClass(submitResult.verdict)}`}>
                  <span className="interview-verdict-label">{submitResult.verdict}</span>
                  <span className="interview-verdict-count">
                    {submitResult.passed_count} / {submitResult.total_count} passed
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
