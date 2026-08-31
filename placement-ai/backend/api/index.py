"""Vercel serverless entrypoint.

Vercel's Python runtime looks for an ASGI `app` object in files under
`api/`; the real application (routes, db, prompts, ...) lives in the
`app/` package next to this file, unchanged from what runs locally or
on any other host. This file only exists to satisfy Vercel's
entrypoint convention - it's not named `app.py` because that would
collide with the `app/` package it's importing from.
"""

from app.main import app

__all__ = ["app"]
