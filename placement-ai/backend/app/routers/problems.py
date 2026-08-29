"""Module 5 - Technical Interview problem bank.

GET /problems lists {id, title, difficulty, topic, companies} - enough to
render the problem list plus its topic/difficulty/company filters, but no
test cases at all. Filtering itself happens client-side (the frontend
already has the full list in hand, and there are only a few dozen problems
- no need for a server round-trip per filter change), so this endpoint
takes no query params and always returns everything.

GET /problems/{id} returns full problem detail plus visible_test_cases.
hidden_test_cases is deliberately not a field on either response model
below, so it can never end up in a response regardless of what's passed in.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.problems import PROBLEMS, Example, TestCase

router = APIRouter(prefix="/problems", tags=["problems"])

_PROBLEMS_BY_ID = {problem.id: problem for problem in PROBLEMS}


class ProblemSummary(BaseModel):
    id: str
    title: str
    difficulty: str
    topic: str
    companies: list[str]


class ProblemDetail(BaseModel):
    id: str
    title: str
    difficulty: str
    topic: str
    companies: list[str]
    description: str
    constraints: list[str]
    examples: list[Example]
    visible_test_cases: list[TestCase]
    stub: str
    # No hidden_test_cases field here, by design - see module docstring.
    # function_name is also omitted - it's an execute.py implementation
    # detail (which function the judge harness calls), not something the
    # frontend needs; the stub is what actually gets shown in the editor.


@router.get("")
async def list_problems() -> list[ProblemSummary]:
    """Everything needed to render the problem list and its filters."""
    return [
        ProblemSummary(
            id=problem.id,
            title=problem.title,
            difficulty=problem.difficulty,
            topic=problem.topic,
            companies=problem.companies,
        )
        for problem in PROBLEMS
    ]


@router.get("/{problem_id}")
async def get_problem(problem_id: str) -> ProblemDetail:
    problem = _PROBLEMS_BY_ID.get(problem_id)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")

    return ProblemDetail(
        id=problem.id,
        title=problem.title,
        difficulty=problem.difficulty,
        topic=problem.topic,
        companies=problem.companies,
        description=problem.description,
        constraints=problem.constraints,
        examples=problem.examples,
        visible_test_cases=problem.visible_test_cases,
        stub=problem.stub,
    )
