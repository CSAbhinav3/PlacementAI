# Deploying PlacementAI

Both services live on **Vercel** as separate projects from this same repo:
the **backend** (FastAPI, as a Python serverless function) and the
**frontend** (a static Vite build). Chat history persists to **Turso**, a
hosted SQLite-compatible database, since a serverless function has no local
disk to keep a `chat.db` file on between requests.

Everything below is genuinely free, no card required anywhere.

Total time: ~15 minutes. You'll need:
- A [Groq API key](https://console.groq.com/keys) (free) - powers Chat,
  Resume, Roadmap, and Mock Interview.
- A [Turso](https://turso.tech) database (free, no card) - chat history.
- Accounts on [vercel.com](https://vercel.com) (supports signing in with
  GitHub).

## Why this shape

- Vercel's Python runtime runs a FastAPI app as a serverless ASGI function -
  no separate always-on server to pay for or keep warm.
- That function is stateless between invocations, so chat history can't
  live in a local SQLite file the way `backend/app/db.py` originally did.
  Turso keeps the exact same schema/queries, just reachable over HTTP
  instead of a local file - see `app/db.py` for the full explanation.
- Code execution (Technical Interview's Run/Submit) calls the public
  Judge0 API (`https://ce.judge0.com`) - no setup or key needed, and
  nothing to deploy for it. It's a shared public service, so expect
  occasional slowness/rate limits under heavy use; `JUDGE0_BASE_URL` is
  already an env var on the backend if you ever want to point it at a
  self-hosted Judge0 instance instead.

## 1. Push to GitHub

If you haven't already:

```bash
git push origin main
```

Vercel deploys by connecting to this repo, so it needs to be on GitHub
first.

## 2. Create a Turso database

1. On [turso.tech](https://turso.tech), sign in and **Create Database**.
   Pick whichever region is closest to you.
2. On the database's page, copy the **Database URL** - it looks like
   `libsql://your-db-your-org.turso.io`. You'll paste it into Vercel in a
   moment, but change the scheme to `https://` first (not `libsql://`) -
   the `libsql://` scheme makes the client try a WebSocket connection,
   which doesn't complete inside Vercel's serverless environment.
3. Click **Create Token** (Read & Write, never expires is fine) and copy
   the token shown - **it's only shown once**, so copy it now before
   closing the dialog.

## 3. Deploy the backend (Vercel)

1. On [vercel.com/new](https://vercel.com/new), import this GitHub repo.
2. Set **Root Directory** to `placement-ai/backend`. Vercel auto-detects
   the "FastAPI" application preset from there - no build command changes
   needed, and no `vercel.json` required (one was tried and removed; it
   broke path routing by rewriting every request to a literal path instead
   of preserving it - Vercel's own framework detection handles this
   correctly on its own).
3. Under **Environment Variables**, add:
   - `GROQ_API_KEY` - your key from console.groq.com.
   - `TURSO_DATABASE_URL` - the `https://...turso.io` URL from step 2.
   - `TURSO_AUTH_TOKEN` - the token from step 2.
   - `CORS_ORIGINS` - leave as `http://localhost:5173` for now; you'll
     update this in step 5 once the frontend has a real URL.
4. Deploy. Note the URL Vercel gives you, e.g.
   `https://placementai-backend.vercel.app`. Confirm it's up:
   ```bash
   curl https://placementai-backend.vercel.app/health
   ```
   should return `{"status":"ok"}`.

## 4. Deploy the frontend (Vercel)

1. Back on [vercel.com/new](https://vercel.com/new), import the **same**
   GitHub repo again as a second, separate project.
2. Set **Root Directory** to `placement-ai/frontend`. Vercel auto-detects
   Vite from there.
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = the backend URL from step 3 (e.g.
     `https://placementai-backend.vercel.app`, no trailing slash).

   This gets baked into the build at build time (it's a Vite env var, not
   read at runtime) - if you change it later, you need to redeploy.
4. Deploy. Note the URL Vercel gives you, e.g.
   `https://placementai-frontend.vercel.app`.

## 5. Close the loop: point the backend's CORS at the real frontend URL

Back on the backend project's **Environment Variables** settings, edit
`CORS_ORIGINS` to include the frontend URL from step 4:

```
CORS_ORIGINS=https://placementai-frontend.vercel.app,http://localhost:5173
```

(Comma-separated - keeping `localhost:5173` alongside the real URL means
local frontend dev can keep hitting the deployed backend too.) Save, then
redeploy the backend from its Deployments tab (env var changes don't
auto-redeploy). Once that's done, open the frontend URL and confirm
Chat/Resume/Roadmap/Technical Interview/Mock Interview all work end to end.

## Updating a live deploy

Both projects auto-redeploy on every push to `main` - just `git push` as
usual. Only env var changes need the manual dashboard + redeploy steps
above; code changes need nothing extra.
