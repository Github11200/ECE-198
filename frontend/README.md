# Clinic website and demonstration portals

A Next.js App Router frontend for the ECE 198 project, branded as **Alder Rehabilitation**. The website and demo logins are preserved from the teammate's branch. The Admin Panel now uses the current CCCARE Python tracker API. Participant plan/progress pages still use explicitly labeled illustrative records.

## Run

From the repository root on Windows:

```powershell
.\start-frontend.cmd
```

Open **http://127.0.0.1:8000**. The script installs missing dependencies, builds a static export, and starts Python. To use another port, run `.\start-frontend.cmd --port 8001`. Do not start a second server on an occupied port.

On another machine, install Node.js 20.9 or newer, then:

```sh
cd frontend
npm ci
npm run build
npm start
```

In PowerShell environments where `npm.ps1` is blocked, use `npm.cmd`.

## Demo walkthrough

1. Start on the clinic programme page and select **Participant login**. Enter any Name and Password and select **Sign in**. The fields are not validated, read, stored, or sent to a server. The participant-only **Create account** button is disabled. Expand an exercise to see its plan details and latest demo score. In **Past exercise sessions**, expand a date to see each session that day, its time, and the recorded exercises. Select **My progress** to view the score trend across all recorded days or the last four recorded days.
2. Select **View admin portal**, enter any Name and Password, and select **Sign in** to open the instructor workspace. Search or filter the roster, open a participant record, and change their demo rep target.
3. Select **Prepare a session**, choose any of the seven backend exercises, set the station and input source, and assign one to five IDs P01–P99 and rep targets to camera lanes. The default setup is three participants and ten squats each. Synthetic replay runs generated joints through the Python scorer. Camera and recording sessions use the existing separate AlphaPose bridge.
4. **Open monitor** shows actual independent reps, range cues, joint angles, and tracking reasons. Closing it keeps tracking active. **End & save session** writes the real session to SQLite and opens its summary. **Open workout report / print** opens a printable report. **Session history** survives browser reloads and Python restarts. New-session target edits on the current page are setup drafts, not changes to an active session.

The participant portal only displays the exercise plan and progress. It does not run exercise sessions.

Participant history contains eight mock sessions across six past dates, including two sessions on some days. Exercise scores are illustrative whole numbers out of 100, with the same colour rules on cards, history rows, averages, and chart points: **80–100 blue**, **60–79 green**, **40–59 yellow**, **20–39 orange**, **0–19 red**. Session and day scores are rounded averages of their exercise scores. The records and shared score-band rules are in `src/lib/exercise-history.ts`; date expansion uses native keyboard-accessible disclosure controls.

Names, appointments, and instructor notes on participant programme pages are fictional. Admin roster entries use numbered backend participant IDs, not those fictional names. Admin counts, scores, notes, and history come from Python/SQLite and retain their actual source labels. Demo login performs navigation only; it does not authenticate users. The clinic image subjects are not the participants. The AlphaPose and optional wearable/Convex path remain in Python, as described in the root docs. The original instructor dashboard is retained at `/tracker`.

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

`npm run build` checks TypeScript and generates ignored `out/`. `npm run typecheck` checks types independently. After building, `npm start` serves the website and API through `../app.py`. Next.js/Node are needed to build, not to run the built export. Follow `AGENTS.md` and the installed Next.js documentation before changing framework conventions.

## Brand and assets

Alder has an original SVG monogram, wordmark, and favicon. Its palette uses forest green (`#365343`), warm cream (`#f5f1e8`), and muted clay (`#ad6c50`). The public site and both portals use the same identity. Copy describes general rehabilitation rather than a particular real clinic or condition. The footer identifies Alder as a fictional demonstration clinic.

Photography is by **Funkcinės Terapijos Centras**, downloaded from Pexels. These are stock photographs, not images of the fictional clinic's staff or participants. Photo source pages:

- [Supervised rehabilitation exercise](https://www.pexels.com/photo/physiotherapist-exercising-with-a-patient-20860617/)
- [Individual physiotherapy session](https://www.pexels.com/photo/physiotherapist-holding-patient-leg-20860584/)
- [Inter font license](public/fonts/OFL.txt)

Photos, the original logo, and fonts are served locally. The previous reference clinic's branding and assets have been removed. No external analytics or account services are included. The earlier `/cancer-exercise-program` route remains as a compatibility alias; `/rehabilitation-programme` is the generic programme route.
