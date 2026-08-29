"""Module 5 - Technical Interview code execution.

POST /execute/run runs submitted code against a problem's visible test
cases and returns per-test-case results.

POST /execute/submit runs against the hidden test cases and returns only
an aggregate verdict - individual hidden cases (inputs, expected outputs,
even which ones failed) are never returned to the client.

Both endpoints look the problem up server-side by problem_id and use its
own stored test cases - test cases are never accepted from the client, so
there's no way to submit code against arbitrary/forged expected output.

## Execution backend

Code runs via Judge0 (https://ce.judge0.com), a public, no-auth-required
code execution API. (The task originally specified the Piston API at
emkc.org, but as of this writing Piston's public API has gone whitelist-only
and rejects unauthenticated requests outright - see
https://github.com/engineer-man/piston#public-api. Judge0 was chosen as a
comparable drop-in replacement per user direction.) JUDGE0_BASE_URL can be
overridden via env var to point at a self-hosted instance later without
code changes.

## How a submission is judged

We don't ask the model/user to write a full program that reads stdin - the
student writes just the function named in the problem's `function_name`
(e.g. `def solve(nums, target): ...`). We append a small harness to their
code that, for each test case's `input` string (e.g.
"nums = [2, 7, 11, 15], target = 9"), executes it as one or more Python
assignment statements to build a local namespace, then calls
`function_name(**that_namespace)` - which works because the test case
input's variable names are exactly the function's parameter names, by
construction (see problems.py). Each call's return value is JSON-serialized
and collected into a single JSON array printed at the end, which we parse
back out of Judge0's stdout.

A test case `input` like "nums = [2, 7, 11, 15], target = 9" isn't valid as
a single Python statement as-is (chained "name = value, name = value" isn't
assignment syntax) - _INPUT_ASSIGNMENT_SPLIT splits it into separate
statements on commas that are followed by "identifier =", which are joined
with newlines before being compiled/exec'd. This is safe for our own
hand-written problem data because none of our list/string literals contain
that "<comma><identifier>=" pattern internally.
"""

import json
import logging
import os
import re

import httpx2 as httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.problems import PROBLEMS, Problem, TestCase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/execute", tags=["execute"])

_PROBLEMS_BY_ID = {problem.id: problem for problem in PROBLEMS}

JUDGE0_BASE_URL = os.environ.get("JUDGE0_BASE_URL", "https://ce.judge0.com")
# Python (3.12.5) per GET {JUDGE0_BASE_URL}/languages on ce.judge0.com -
# check that endpoint again if this ever starts 404ing/erroring, language
# IDs aren't guaranteed stable across Judge0 instances/versions.
PYTHON_LANGUAGE_ID = 100
JUDGE0_TIMEOUT = httpx.Timeout(20.0, connect=10.0)
CPU_TIME_LIMIT_SECONDS = 5

_INPUT_ASSIGNMENT_SPLIT = re.compile(r",\s*(?=[A-Za-z_]\w*\s*=)")

_HARNESS_TEMPLATE = r'''

import json as __json
import re as __re

__test_inputs = __json.loads(__TEST_INPUTS_JSON__)
__results = []
for __raw in __test_inputs:
    __ns = {}
    try:
        __parts = __re.split(r",\s*(?=[A-Za-z_]\w*\s*=)", __raw)
        exec(compile("\n".join(__parts), "<test input>", "exec"), globals(), __ns)
        __out = __FUNCTION_NAME__(**__ns)
        try:
            __serialized = __json.dumps(__out)
        except TypeError:
            __serialized = __json.dumps(str(__out))
        __results.append({"ok": True, "value": __serialized})
    except Exception as __e:
        __results.append({"ok": False, "error": f"{type(__e).__name__}: {__e}"})
print(__json.dumps(__results))
'''


class ExecuteRequest(BaseModel):
    problem_id: str
    code: str


class TestCaseResult(BaseModel):
    input: str
    expected_output: str
    actual_output: str | None
    passed: bool
    stderr: str | None = None


class RunResponse(BaseModel):
    results: list[TestCaseResult]
    # Set only when the whole run failed before any test case could
    # execute (a syntax error, or the execution service itself failing) -
    # every entry in `results` will be a uniform failure carrying this
    # same message in that case.
    error: str | None = None


class SubmitResponse(BaseModel):
    passed_count: int
    total_count: int
    verdict: str  # "Accepted" | "Wrong Answer" | "Runtime Error"


def _get_problem_or_404(problem_id: str) -> Problem:
    problem = _PROBLEMS_BY_ID.get(problem_id)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


def _build_source(user_code: str, function_name: str, test_case_inputs: list[str]) -> str:
    if not function_name.isidentifier():
        # Defense in depth - function_name only ever comes from our own
        # hardcoded problems.py, but never string-format untrusted-shaped
        # data into generated source without checking it first.
        raise ValueError(f"Invalid function_name: {function_name!r}")

    harness = _HARNESS_TEMPLATE.replace("__TEST_INPUTS_JSON__", repr(json.dumps(test_case_inputs))).replace(
        "__FUNCTION_NAME__", function_name
    )
    return f"{user_code}\n{harness}"


async def _call_judge0(source_code: str) -> dict:
    """POST one synchronous submission to Judge0.

    Raises on network/timeout/non-2xx failure - callers catch this and
    degrade to a Runtime Error verdict rather than propagating it.
    """
    async with httpx.AsyncClient(timeout=JUDGE0_TIMEOUT) as client:
        response = await client.post(
            f"{JUDGE0_BASE_URL}/submissions",
            params={"wait": "true", "base64_encoded": "false"},
            json={
                "language_id": PYTHON_LANGUAGE_ID,
                "source_code": source_code,
                "cpu_time_limit": CPU_TIME_LIMIT_SECONDS,
            },
        )
        response.raise_for_status()
        return response.json()


def _values_equal(actual_json: str, expected_json: str) -> bool:
    """Compare two JSON-encoded values structurally rather than as raw
    strings, so incidental formatting differences (that our own harness
    shouldn't produce, but just in case) don't cause false negatives.
    """
    try:
        return json.loads(actual_json) == json.loads(expected_json)
    except (json.JSONDecodeError, TypeError):
        return actual_json == expected_json


def _all_failed(test_cases: list[TestCase], message: str) -> list[TestCaseResult]:
    return [
        TestCaseResult(
            input=tc.input,
            expected_output=tc.expected_output,
            actual_output=None,
            passed=False,
            stderr=message,
        )
        for tc in test_cases
    ]


async def _judge(problem: Problem, code: str, test_cases: list[TestCase]) -> tuple[list[TestCaseResult], str | None]:
    """Run `code` against `test_cases` and return (per-test results, whole-run error).

    whole-run error is set (and every result marked failed with it) when
    nothing could be judged at all: a Judge0/network failure, or the
    submitted code failing to even run (e.g. a syntax error) so the harness
    never printed its result JSON.
    """
    if not test_cases:
        return [], None

    source = _build_source(code, problem.function_name, [tc.input for tc in test_cases])

    try:
        judge0_result = await _call_judge0(source)
    except Exception:
        logger.warning("Judge0 call failed", exc_info=True)
        message = "Could not reach the code execution service. Please try again."
        return _all_failed(test_cases, message), message

    status_id = (judge0_result.get("status") or {}).get("id")
    stdout = judge0_result.get("stdout")

    # status id 3 is Judge0's "Accepted" - meaning the process ran to
    # completion (exit 0), not that the *answer* was correct. Anything else
    # (syntax error, timeout, signal, ...) means our harness's final print
    # never ran, so there's no per-test JSON to parse.
    if status_id != 3 or not stdout:
        message = judge0_result.get("stderr") or judge0_result.get("compile_output") or judge0_result.get("message")
        message = (message or "Execution failed.").strip()
        return _all_failed(test_cases, message), message

    try:
        parsed = json.loads(stdout)
        if not isinstance(parsed, list) or len(parsed) != len(test_cases):
            raise ValueError("Unexpected result shape")
    except (json.JSONDecodeError, ValueError):
        message = "Could not parse execution output."
        return _all_failed(test_cases, message), message

    results = []
    for tc, item in zip(test_cases, parsed):
        if not isinstance(item, dict) or "ok" not in item:
            results.append(
                TestCaseResult(
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=None,
                    passed=False,
                    stderr="Malformed result from the execution harness.",
                )
            )
        elif not item.get("ok"):
            results.append(
                TestCaseResult(
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=None,
                    passed=False,
                    stderr=str(item.get("error") or "Unknown error"),
                )
            )
        else:
            actual = str(item.get("value"))
            results.append(
                TestCaseResult(
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=actual,
                    passed=_values_equal(actual, tc.expected_output),
                    stderr=None,
                )
            )

    return results, None


@router.post("/run")
async def run_code(request: ExecuteRequest) -> RunResponse:
    """Run submitted code against the problem's visible test cases only."""
    problem = _get_problem_or_404(request.problem_id)
    results, error = await _judge(problem, request.code, problem.visible_test_cases)
    return RunResponse(results=results, error=error)


@router.post("/submit")
async def submit_code(request: ExecuteRequest) -> SubmitResponse:
    """Run submitted code against the problem's hidden test cases and
    return only the aggregate verdict - never the individual hidden cases.
    """
    problem = _get_problem_or_404(request.problem_id)
    results, error = await _judge(problem, request.code, problem.hidden_test_cases)

    total = len(results)
    passed = sum(1 for r in results if r.passed)
    # A per-test-case exception (r.stderr set on an otherwise-parsed run)
    # is a Runtime Error, same as a whole-run failure - reserve "Wrong
    # Answer" for code that ran cleanly on every case but returned an
    # incorrect value on at least one.
    has_exception = any(r.stderr for r in results)

    if error or has_exception:
        verdict = "Runtime Error"
    elif total > 0 and passed == total:
        verdict = "Accepted"
    else:
        verdict = "Wrong Answer"

    return SubmitResponse(passed_count=passed, total_count=total, verdict=verdict)
