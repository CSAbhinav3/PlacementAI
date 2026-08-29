"""Shared Groq (OpenAI-compatible) client, used by both /chat and /resume/draft.

Pulled out of main.py so routers can use the same client/model without
importing from main (which would be circular, since main imports the
routers).
"""

import os

import openai
from dotenv import load_dotenv

load_dotenv()

MODEL = "openai/gpt-oss-120b"
# Check https://console.groq.com/docs/models or GET
# https://api.groq.com/openai/v1/models for current valid model IDs if this
# ever 404s again - Groq deprecates models periodically.

# Groq exposes an OpenAI-compatible API, so the standard openai client works
# unmodified - just pointed at Groq's base_url with a Groq API key.
client = openai.AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY"),
)
