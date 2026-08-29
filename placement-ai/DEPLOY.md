# Deploying PlacementAI

Two services, deployed separately: the **backend** (FastAPI, needs to stay
running) on Render, and the **frontend** (a static Vite build) on Vercel.
Both have generous free tiers and deploy straight from this GitHub repo.

Total time: ~15 minutes. You'll need:
- A [Groq API key](https://console.groq.com/keys) (free) - powers Chat,
  Resume, Roadmap, and Mock Interview.
- Accounts on [render.com](https://render.com) and [vercel.com](https://vercel.com)
  (both support signing in with GitHub).

## Why two hosts, and what's ephemeral

- The backend can't be a static site or a serverless function the way the
  frontend can - it streams chat responses over SSE and needs a
  long-running process.
- Chat history is a local SQLite file (`backend/app/chat.db`) by default.
  Most free-tier hosts (Render's included) wipe local disk on every
  redeploy/restart, so **chat history won't persist across deploys unless
  you attach a paid persistent disk** (see step 4). Fine for trying this
  out; something to know before you rely on it.
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

Both Render and Vercel deploy by connecting to this repo, so it needs to
be on GitHub first.

## 2. Deploy the backend (Render)

1. On [render.com](https://render.com), **New +** → **Blueprint**.
2. Connect this GitHub repo. Render will look for a `render.yaml` - point
   the blueprint's root at the `placement-ai` directory (this repo has
   the app nested one level down, not at the repo root).
3. Render reads `placement-ai/backend/render.yaml` and proposes one web
   service, `placementai-backend`. Confirm.
4. Before the first deploy finishes, open the service's **Environment**
   tab and set:
   - `GROQ_API_KEY` - your key from console.groq.com.
   - `CORS_ORIGINS` - leave as `http://localhost:5173` for now; you'll
     update this in step 4 once the frontend has a real URL.
5. Deploy. Once it's live, note the URL Render gives you - something like
   `https://placementai-backend.onrender.com`. Confirm it's up:
   ```bash
   curl https://placementai-backend.onrender.com/health
   ```
   should return `{"status":"ok"}`.

   Render's free tier spins a service down after inactivity - the first
   request after a quiet period can take 30-60s to wake it back up. That's
   normal, not a bug.

## 3. Deploy the frontend (Vercel)

1. On [vercel.com](https://vercel.com), **Add New** → **Project**, import
   this same GitHub repo.
2. Vercel will ask for the project's **Root Directory** - set it to
   `placement-ai/frontend`. It auto-detects Vite from there; no build
   command changes needed.
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = the Render backend URL from step 2 (e.g.
     `https://placementai-backend.onrender.com`, no trailing slash).

   This gets baked into the build at build time (it's a Vite env var, not
   read at runtime) - if you change it later, you need to redeploy.
4. Deploy. Note the URL Vercel gives you, e.g.
   `https://placementai.vercel.app`.

## 4. Close the loop: point the backend's CORS at the real frontend URL

Back on Render, open the backend service's **Environment** tab again and
update `CORS_ORIGINS` to the Vercel URL from step 3:

```
CORS_ORIGINS=https://placementai.vercel.app
```

(Comma-separate multiple origins if you also want e.g. a preview-deploy
domain allowed.) Save - Render redeploys automatically. Once that's done,
open the Vercel URL and confirm Chat/Resume/Roadmap/Technical
Interview/Mock Interview all work end to end.

## Updating a live deploy

Both platforms auto-redeploy on every push to `main` by default - just
`git push` as usual. No extra steps for typical code changes; only
`render.yaml` and env var changes need the manual dashboard steps above.

## Optional: persistent chat history

By default `chat.db` resets on every backend redeploy. To keep it:

1. Upgrade the Render service off the free tier (persistent disks aren't
   available on it).
2. In `backend/render.yaml`, uncomment the `disk:` block and the `DB_DIR`
   env var, then redeploy (push the change, or click "Sync" from a
   Blueprint update in the Render dashboard).

`DB_DIR` defaults to sitting next to the app code if unset - the uncommented
disk config points it at a separate mounted directory instead, so the
disk mount doesn't shadow the app's own source files.
