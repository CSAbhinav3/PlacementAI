"""Module 2 - Resume Generator.

POST /resume/draft sends experience bullets and project descriptions to Groq
for polishing (stronger verbs, quantified impact, ATS-friendly plain text),
then returns the full ResumeData with the polished text slotted back in.
personal_info, education, and skills are never sent to the model and are
returned unchanged.
"""

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from app.groq_client import MODEL, client
from app.prompts import RESUME_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resume", tags=["resume"])


class PersonalInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    linkedin: str = ""
    location: str = ""


class EducationEntry(BaseModel):
    degree: str
    institution: str
    year: str = ""
    gpa: str = ""


class ExperienceEntry(BaseModel):
    title: str
    company: str
    duration: str = ""
    bullets: list[str] = []


class ProjectEntry(BaseModel):
    name: str
    description: str = ""
    tech_stack: list[str] = []
    link: str = ""


class ResumeData(BaseModel):
    personal_info: PersonalInfo
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    skills: list[str] = []
    projects: list[ProjectEntry] = []


def _valid_bullets(candidate: object, expected_len: int) -> list[str] | None:
    """Return `candidate` if it's a same-length list of non-empty strings, else None."""
    if not isinstance(candidate, list) or len(candidate) != expected_len:
        return None
    if not all(isinstance(b, str) and b.strip() for b in candidate):
        return None
    return candidate


async def _polish_content(
    experience: list[ExperienceEntry], projects: list[ProjectEntry]
) -> tuple[list[list[str]], list[str]]:
    """Ask the model to polish bullets/descriptions.

    Falls back to the original text - per entry, or entirely - on any
    failure: an API error, a non-JSON response, or a response whose shape
    doesn't match what we sent (wrong array length, missing keys, etc). This
    always returns lists the same shape as the input, so callers can zip
    them straight back onto the original entries.
    """
    original_bullets = [entry.bullets for entry in experience]
    original_descriptions = [proj.description for proj in projects]

    # Nothing worth sending to the model (e.g. the form is still empty).
    if not any(original_bullets) and not any(d.strip() for d in original_descriptions):
        return original_bullets, original_descriptions

    payload = {
        "experience": [{"bullets": bullets} for bullets in original_bullets],
        "projects": [{"description": description} for description in original_descriptions],
    }

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=2048,
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": RESUME_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        polished = json.loads(response.choices[0].message.content)
    except Exception:
        # Broad by design: any Groq/openai client error (bad status, timeout,
        # connection failure, ...) or malformed JSON (json.JSONDecodeError)
        # should degrade to the original text rather than break resume
        # submission.
        logger.warning("Resume polishing failed; returning original text.", exc_info=True)
        return original_bullets, original_descriptions

    polished_bullets = list(original_bullets)
    polished_experience = polished.get("experience") if isinstance(polished, dict) else None
    if isinstance(polished_experience, list):
        for i, entry in enumerate(polished_experience):
            if i >= len(polished_bullets):
                break
            bullets = entry.get("bullets") if isinstance(entry, dict) else None
            validated = _valid_bullets(bullets, len(original_bullets[i]))
            if validated is not None:
                polished_bullets[i] = validated

    polished_descriptions = list(original_descriptions)
    polished_projects = polished.get("projects") if isinstance(polished, dict) else None
    if isinstance(polished_projects, list):
        for i, proj in enumerate(polished_projects):
            if i >= len(polished_descriptions):
                break
            description = proj.get("description") if isinstance(proj, dict) else None
            if isinstance(description, str) and description.strip():
                polished_descriptions[i] = description

    return polished_bullets, polished_descriptions


@router.post("/draft")
async def draft_resume(data: ResumeData) -> ResumeData:
    """Polish experience bullets and project descriptions via Groq.

    personal_info, education, and skills are structural/factual - they're
    never sent to the model and come back exactly as submitted.
    """
    polished_bullets, polished_descriptions = await _polish_content(data.experience, data.projects)

    experience = [
        entry.model_copy(update={"bullets": bullets})
        for entry, bullets in zip(data.experience, polished_bullets)
    ]
    projects = [
        proj.model_copy(update={"description": description})
        for proj, description in zip(data.projects, polished_descriptions)
    ]

    return data.model_copy(update={"experience": experience, "projects": projects})
