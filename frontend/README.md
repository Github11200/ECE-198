# Clinic website and demonstration portals

A separate Next.js App Router application for the ECE 198 presentation, branded as **Alder Rehabilitation**, a fictional physiotherapy and guided-exercise clinic. Admin and participant login pages accept any values and open prepared demonstration portals.

## Run

From the repository root on Windows:

```powershell
.\start-frontend.cmd
```

Open **http://127.0.0.1:3000**. To use another port, run `.\start-frontend.cmd -- --port 3001`.

On another machine, install Node.js 20.9 or newer, then:

```sh
cd frontend
npm ci
npm run dev
```

In PowerShell environments where `npm.ps1` is blocked, use `npm.cmd`.

## Demo walkthrough

1. Start on the clinic programme page and select **Participant login**. Enter any Name and Password and select **Sign in**. The fields are not validated, read, stored, or sent to a server. The participant-only **Create account** button is disabled. Expand an exercise to see its plan details. Select **My progress** to see session history and switch the chart between four and eight weeks.
2. Select **View admin portal**, enter any Name and Password, and select **Sign in** to open the instructor workspace. Search or filter the roster, open a participant record, and change their demo rep target.
3. Select **Prepare a session**, choose the participants, and start the demo. Rep counts advance from a local timer. Pause, resume, or end and save it.
4. Open **Session history** and select **View summary**. Saved demo session summaries stay in sessionStorage for this browser tab. Target changes last on the current page.

The participant portal only displays the exercise plan and progress. It does not run exercise sessions.

All names, records, appointments, and instructor notes are fictional. No authentication, patient database, API requests, webcam access, AlphaPose connection, or Convex connection is implemented. The clinic image subjects are not the fictional participants. The existing Python tracker remains independently available through `start-dashboard.cmd` on port 8000.

## Files

```text
frontend/
  src/app/          App Router pages and global styling
  src/components/  Clinic header, portal layouts, charts, dialogs
  src/lib/         Prepared demonstration records
  public/images/   Locally stored rehabilitation stock photographs
  public/fonts/    Inter fonts and their OFL license
```

`npm run build` checks TypeScript and generates the production build. `npm run typecheck` checks types independently. After building, `npm start` serves the production application.

## Brand and assets

Alder has an original SVG monogram, wordmark, and favicon. Its palette uses forest green (`#365343`), warm cream (`#f5f1e8`), and muted clay (`#ad6c50`). The public site and both portals use the same identity. Copy describes general rehabilitation rather than a particular real clinic or condition. The footer identifies Alder as a fictional demonstration clinic.

Photography is by **Funkcinės Terapijos Centras**, downloaded from Pexels. These are stock photographs, not images of the fictional clinic's staff or participants. Photo source pages:

- [Supervised rehabilitation exercise](https://www.pexels.com/photo/physiotherapist-exercising-with-a-patient-20860617/)
- [Individual physiotherapy session](https://www.pexels.com/photo/physiotherapist-holding-patient-leg-20860584/)
- [Inter font license](public/fonts/OFL.txt)

Photos, the original logo, and fonts are served locally. The previous reference clinic's branding and assets have been removed. No external analytics or account services are included. The earlier `/cancer-exercise-program` route remains as a compatibility alias; `/rehabilitation-programme` is the generic programme route.
