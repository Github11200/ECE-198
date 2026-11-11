# Clinic website and demonstration portals

A Next.js App Router frontend for the ECE 198 project, branded as **Alder Rehabilitation**. The Admin Panel uses the local Python tracker API. The participant portal reads individual results from the shared Convex archive when configured.

## Run

From the repository root on Windows:

```powershell
.\scripts\start-frontend.cmd
```

Open **http://127.0.0.1:8000**. The script installs missing dependencies, builds a static export, and starts Python. To use another port, run `.\scripts\start-frontend.cmd --port 8001`. Do not start a second server on an occupied port.

On another machine, install Node.js 20.9 or newer, then:

```sh
cd frontend
npm ci
npm run build
npm start
```

In PowerShell environments where `npm.ps1` is blocked, use `npm.cmd`.

## Demo walkthrough

1. Select **Participant login**, enter demo values, and sign in. When Convex is configured, connect with the read token and select a participant ID to see that person's recorded sessions. Demo login only controls navigation.
2. Select **View admin portal**, enter any Name and Password, and select **Sign in** to open the instructor workspace. Search or filter the roster, open a participant record, and change their demo rep target.
3. Select **Prepare a session**, choose any of the seven backend exercises, set the station and input source, and assign one to five IDs P01–P99 and rep targets to camera lanes. The default setup is three participants and ten squats each. **Start session** launches AlphaPose for live camera input. Synthetic replay runs generated joints through the Python scorer. The recorded JSON input uses a separate bridge command.
4. **Open monitor** shows actual independent reps, range cues, joint angles, and tracking reasons. Closing it keeps tracking active. **End & save session** writes the real session to SQLite and opens its summary. **Open workout report / print** opens a printable report. **Session history** survives browser reloads and Python restarts. New-session target edits on the current page are setup drafts, not changes to an active session.

The participant portal only displays the exercise plan and progress. It does not run exercise sessions.

Admin roster entries use numbered participant IDs. The admin monitor and recent reports come from the local Python/SQLite backend. If connected, Convex contributes shared archive history. The original instructor dashboard is available at `/tracker`.

The production export is served with the API on the same Python origin. `npm run dev` remains a standalone design preview on port 3000; its Admin API is unavailable there. Use `npm run build` followed by `npm start` (or the root launcher) for connected testing. After source changes, rebuild and refresh the Python-served site; the backend does not need a restart just to pick up a rebuilt frontend.

## Files

```text
frontend/
  src/app/          App Router pages and global styling
  src/components/  Clinic header, portal layouts, charts, dialogs
  src/lib/         Prepared demonstration records
  public/images/   Locally stored rehabilitation stock photographs
  public/fonts/    Inter fonts and their OFL license
```

`npm run build` checks TypeScript and generates ignored `out/`. `npm run typecheck` checks types independently. After building, `npm start` serves the website and API through `python -m backend.tracker.server`, run from the repository root. Next.js/Node are needed to build, not to run the built export. Follow `AGENTS.md` and the installed Next.js documentation before changing framework conventions.

## Brand and assets

Alder has an original SVG monogram, wordmark, and favicon. The public site and both portals retain that identity, using forest green (`#365343`) with white/grey surfaces and a few retained clinic accent colours. The homepage describes the CCCARE tracker workflow and identifies it as a classroom prototype. Alder is a fictional demonstration brand, not a real clinic.

The subsequent visual refinement retains the Alder branding with a quieter white/grey treatment in `src/app/refinements.css`. The homepage now introduces the actual session tracker and workflow. Portal headings use direct labels, admin metrics use a compact summary strip, and table text has stronger contrast. Promotional slogans and repeated landing-page sections were removed. Participant records remain clearly labeled as demonstrations; the real Admin API and scoring/storage logic are unaffected.

Photography is by **Funkcinės Terapijos Centras**, downloaded from Pexels. These are stock photographs, not images of the fictional clinic's staff or participants. Photo source pages:

- [Supervised rehabilitation exercise](https://www.pexels.com/photo/physiotherapist-exercising-with-a-patient-20860617/)
- [Individual physiotherapy session](https://www.pexels.com/photo/physiotherapist-holding-patient-leg-20860584/)
- [Inter font license](public/fonts/OFL.txt)

Photos, the original logo, and fonts are served locally. The previous reference clinic's branding and assets have been removed. No external analytics or account services are included. The earlier `/cancer-exercise-program` route remains as a compatibility alias; `/rehabilitation-programme` is the generic programme route.
