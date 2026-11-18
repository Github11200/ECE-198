# Alder Rehabilitation frontend

SvelteKit (Svelte 5, TypeScript, Tailwind v4, shadcn-svelte) site for the ECE 198 CCCARE exercise tracker. It builds to a static site in `out/`, which the Python tracker (`backend/tracker/server.py`) serves on the same origin as its API.

## Pages

- `/`: landing page (workflow, exercise criteria, about).
- `/admin`: instructor dashboard. **Prepare a session** sets the exercise, station, input (camera, replay, or recording), and 1–5 lanes with participant IDs P01–P99 and rep targets. For a camera session the tracker launches AlphaPose itself; the live monitor shows its status and a **Retry camera** button if it stops. **End & save session** saves the result and opens its summary with a printable report (`/reports/<id>`).
- `/patient`: one participant's saved sessions.
- `/rehabilitation-programme`, `/cancer-exercise-program`: programme overview pages (illustrative content).

## Data sources

- **Local tracker (always):** the live monitor polls `GET /api/session`; history comes from `GET /api/history`; start, finish and camera retry are `POST`s to `/api/session/start`, `/api/session/finish` and `/api/camera/retry`.
- **Convex (optional):** with `PUBLIC_CONVEX_URL` set in `frontend/.env` and the team's read token entered in the Connect form, history also comes from the cloud archive (`archive:history`, `archive:personHistory`), merged with the local copy, and live feedback from `feedback:live`. The token is kept in memory only. Never put a token in a `PUBLIC_` variable.

## Commands

```sh
npm ci
npm run dev      # design preview; /api and /reports are proxied to the tracker
                 # at TRACKER_URL (default http://127.0.0.1:8000)
npm run check    # svelte-check / TypeScript
npm test         # vitest + Testing Library
npm run build    # static site in out/
```

pnpm works too. The repo root is a pnpm workspace that includes `frontend`, so `pnpm install` then `pnpm build` (or `pnpm check`, `pnpm test:frontend`) from the root installs and builds everything. Approved dependency install scripts are listed in `pnpm-workspace.yaml`.

For normal use, run `./scripts/start-local.sh` from the repo root. It builds if needed, starts the tracker and the Convex publisher, and opens http://127.0.0.1:8000.

## Assets

Photography is by **Funkcinės Terapijos Centras** from Pexels: stock photographs, not images of real participants. The Alder mark, wordmark and favicon are original SVGs (`src/lib/components/brand.svelte`, `static/icon.svg`).
