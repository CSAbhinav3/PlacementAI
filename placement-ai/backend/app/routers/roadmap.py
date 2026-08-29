"""Module 3 - Roadmap Generator.

POST /roadmap/generate sends the student's target role, level, timeframe,
and known skills to Groq, which returns a personalized, phased learning
roadmap. If the model call fails or returns something that doesn't validate
against RoadmapResponse, this falls back to a generic stub rather than
erroring out - the same defensive pattern used in resume.py.
"""

import json
import logging
from enum import Enum

from fastapi import APIRouter
from pydantic import BaseModel

from app.groq_client import MODEL, client
from app.prompts import ROADMAP_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class ExperienceLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class RoadmapRequest(BaseModel):
    target_role: str
    current_level: ExperienceLevel
    timeframe_months: int
    known_skills: list[str] = []


class RoadmapPhase(BaseModel):
    phase_title: str
    duration_label: str
    focus_summary: str
    milestones: list[str] = []


class RoadmapResponse(BaseModel):
    target_role: str
    total_duration: str
    phases: list[RoadmapPhase]


def _generic_stub(request: RoadmapRequest) -> RoadmapResponse:
    """A fixed fallback roadmap, used when the model call fails or returns
    something that doesn't validate as RoadmapResponse. Not tailored to the
    request beyond echoing target_role/timeframe - just enough to keep the
    endpoint useful rather than erroring out.
    """
    return RoadmapResponse(
        target_role=request.target_role,
        total_duration=f"{request.timeframe_months} months",
        phases=[
            RoadmapPhase(
                phase_title="Foundations",
                duration_label="Weeks 1-4",
                focus_summary="Shore up core fundamentals and fill the biggest known gaps.",
                milestones=[
                    "Review core CS fundamentals (data structures, algorithms, complexity)",
                    "Complete 1-2 small hands-on projects in the target stack",
                ],
            ),
            RoadmapPhase(
                phase_title="Applied Practice",
                duration_label="Weeks 5-8",
                focus_summary="Build role-relevant projects and start structured interview prep.",
                milestones=[
                    "Ship one project that mirrors real work in the target role",
                    "Start timed practice problems 2-3x per week",
                ],
            ),
            RoadmapPhase(
                phase_title="Interview Readiness",
                duration_label="Weeks 9-12",
                focus_summary="Mock interviews, resume polish, and applying.",
                milestones=[
                    "Complete at least 3 mock interviews (technical + behavioral)",
                    "Finalize resume and start applying to target roles",
                ],
            ),
        ],
    )


async def _generate_via_llm(request: RoadmapRequest) -> RoadmapResponse | None:
    """Ask the model for a roadmap tailored to the request.

    Returns None on any failure - an API error, a non-JSON response, or a
    response that doesn't validate against RoadmapResponse - so the caller
    can fall back to a stub instead of crashing.
    """
    payload = {
        "target_role": request.target_role,
        "current_level": request.current_level.value,
        "timeframe_months": request.timeframe_months,
        "known_skills": request.known_skills,
    }

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=3072,
            temperature=0.6,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ROADMAP_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        raw = json.loads(response.choices[0].message.content)
        return RoadmapResponse.model_validate(raw)
    except Exception:
        # Broad by design: any Groq/openai client error (bad status,
        # timeout, connection failure, ...), malformed JSON
        # (json.JSONDecodeError), or a shape that fails RoadmapResponse
        # validation (pydantic.ValidationError) should degrade to a stub
        # rather than break roadmap generation.
        logger.warning("Roadmap generation failed; falling back to a generic stub.", exc_info=True)
        return None


@router.post("/generate")
async def generate_roadmap(request: RoadmapRequest) -> RoadmapResponse:
    """Generate a personalized roadmap via Groq.

    Falls back to a generic stub if the model call fails or returns
    something that doesn't validate as RoadmapResponse.
    """
    return await _generate_via_llm(request) or _generic_stub(request)
