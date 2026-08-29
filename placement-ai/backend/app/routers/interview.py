"""Module 4 - Mock Interview (text-based first pass; voice comes later).

In-memory only - sessions live in a plain dict for the lifetime of the
server process, not SQLite. A mock interview is a one-shot, disposable
practice run (unlike /chat's persisted history, which is meant to survive
restarts and be revisited), so a plain dict - cleared per-session on
/interview/end, and lost entirely on server restart - is the right amount
of persistence here, not a missing feature.

POST /interview/start   {interview_type} -> {session_id, question}
POST /interview/respond {session_id, answer} -> {question}
POST /interview/end     {session_id} -> {summary}
"""

import uuid
from enum import Enum

import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.groq_client import MODEL, client
from app.prompts import BEHAVIORAL_INTERVIEWER_PROMPT, TECHNICAL_INTERVIEWER_PROMPT

router = APIRouter(prefix="/interview", tags=["interview"])

# Interview turns are short and conversational (a sentence or two plus one
# question) - nowhere near /chat's 4096, and capping it keeps a
# hallucinating model from turning one turn into an essay.
TURN_MAX_TOKENS = 300
SUMMARY_MAX_TOKENS = 600

_KICKOFF_MESSAGE = "Please begin the interview with a brief greeting and your first question."

_SUMMARY_SYSTEM_PROMPT = """\
You are reviewing a completed mock interview transcript to give the \
candidate feedback. In the transcript, "assistant" turns are the \
interviewer's questions/follow-ups and "user" turns are the candidate's \
answers.

Write a brief, constructive summary: 2-3 specific strengths and 2-3 \
specific areas to improve, each grounded in something the candidate \
actually said - avoid generic advice that could apply to anyone who took \
this interview. Be encouraging but honest; a vague compliment helps no one.

Plain text only, no markdown formatting (no #, *, **, etc). A short \
"Strengths:" section and a short "Areas to improve:" section, each with a \
few lines, is fine - this will be read on screen, not spoken.
"""

_SUMMARY_REQUEST_MESSAGE = "The interview is now over. Please give the summary."


class InterviewType(str, Enum):
    behavioral = "behavioral"
    technical = "technical"


_SYSTEM_PROMPTS: dict[InterviewType, str] = {
    InterviewType.behavioral: BEHAVIORAL_INTERVIEWER_PROMPT,
    InterviewType.technical: TECHNICAL_INTERVIEWER_PROMPT,
}

# session_id -> {"interview_type": InterviewType, "history": [{"role", "content"}, ...]}
_SESSIONS: dict[str, dict] = {}


class StartRequest(BaseModel):
    interview_type: InterviewType


class StartResponse(BaseModel):
    session_id: str
    question: str


class RespondRequest(BaseModel):
    session_id: str
    answer: str


class RespondResponse(BaseModel):
    question: str


class EndRequest(BaseModel):
    session_id: str


class EndResponse(BaseModel):
    summary: str


def _get_session_or_404(session_id: str) -> dict:
    session = _SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return session


async def _ask_groq(messages: list[dict], max_tokens: int) -> str:
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=messages,
        )
    except openai.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e.message}") from e
    except openai.APIConnectionError as e:
        raise HTTPException(status_code=502, detail="Could not reach the Groq API.") from e
    return response.choices[0].message.content


@router.post("/start")
async def start_interview(request: StartRequest) -> StartResponse:
    system_prompt = _SYSTEM_PROMPTS[request.interview_type]

    question = await _ask_groq(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": _KICKOFF_MESSAGE},
        ],
        TURN_MAX_TOKENS,
    )

    # The kickoff instruction above is internal orchestration, not something
    # a real candidate said - it's used only to bootstrap this first call,
    # not stored, so the session's history contains nothing but genuine
    # interviewer/candidate turns from here on.
    session_id = str(uuid.uuid4())
    _SESSIONS[session_id] = {
        "interview_type": request.interview_type,
        "history": [{"role": "assistant", "content": question}],
    }

    return StartResponse(session_id=session_id, question=question)


@router.post("/respond")
async def respond(request: RespondRequest) -> RespondResponse:
    session = _get_session_or_404(request.session_id)
    system_prompt = _SYSTEM_PROMPTS[session["interview_type"]]

    session["history"].append({"role": "user", "content": request.answer})

    question = await _ask_groq(
        [{"role": "system", "content": system_prompt}, *session["history"]], TURN_MAX_TOKENS
    )

    session["history"].append({"role": "assistant", "content": question})

    return RespondResponse(question=question)


@router.post("/end")
async def end_interview(request: EndRequest) -> EndResponse:
    session = _get_session_or_404(request.session_id)

    summary = await _ask_groq(
        [
            {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
            *session["history"],
            {"role": "user", "content": _SUMMARY_REQUEST_MESSAGE},
        ],
        SUMMARY_MAX_TOKENS,
    )

    del _SESSIONS[request.session_id]

    return EndResponse(summary=summary)
