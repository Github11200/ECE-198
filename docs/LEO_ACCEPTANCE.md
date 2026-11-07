# Leo's demo acceptance checklist

## What is already implemented

The Python backend connects to the local SQLite database at `data/sessions.sqlite3`. Ending a session through the Admin Panel calls `POST /api/session/finish`. The database transaction saves the session and all participant results together. A retry with the same session ID returns the saved result rather than creating a second record.

| Stored record | Fields |
| --- | --- |
| Participant (`participants`) | Stable numbered ID and display label, e.g. P01 / Participant 01 |
| Session (`sessions`) | Session ID, source, exercise, station, start/end timestamps, and criteria snapshot |
| Participant result (`results`) | Session/participant IDs, lane, prescribed target, counts, full/short range, score, tracking metrics, review notes, and per-rep angles |

For this demo, participant ID and label are the user information. Names, editable participant profiles, real authentication, medical records, and heart-rate upload are not implemented. The demo login does not create user accounts. Completed reports survive a Python restart; unfinished sessions are held in memory.

## Actual-session test

1. Open http://127.0.0.1:8000, enter the Admin Panel through the demo login, and choose **Prepare a session**.
2. Select Squats, Live AlphaPose camera, three participants and targets 10/10/10. Assign P01, P02, P03 left to right. For a simpler first check, use one volunteer and one lane.
3. Start the session, then run `start-camera-intel.cmd` on Leo's installed laptop. The launcher uses the existing AlphaPose/OpenVINO logic and opens the preview. Other laptops should follow their hardware-specific setup instead.
4. Keep each participant in their assigned lane with the right hip, knee and ankle visible from a suitable side view. Begin standing. Check each required knee angle is available before exercising.
5. Have each person attempt ten squats, returning to standing between attempts. Record a manual count and label full/short attempts independently of the app.
6. Click **End & save session**. Check each actual result, notes, and the printable report. A prescribed target is not an automatically invented final count.
7. Stop the camera bridge with Ctrl+C. Reload the page and check Session history. In a rehearsal, restart the Python server and confirm the same report remains.

The live path is available for testing, not a claim of validated squat accuracy. Compare actual counts, range labels, tracking loss and latency against the team's targets. Do not write test-fixture camera/replay records into the real history to demonstrate physical accuracy.

## What Leo hands over for wearable integration

- `publish_feedback.py` and the local `/api/session` feed.
- `convex/` relay source and [WEARABLE.md](WEARABLE.md), including payload, ID pairing and cue codes.
- A first P01 test showing the same count, target and cue on the dashboard and wearable.

Jinay configures/deploys the cloud receiver and implements the wearable update path with Erik's hardware. Leo supplies the laptop publisher and joins the integration test. The current board-facing HTTP API is polling-based; true event subscription is a separate implementation decision. Cloud deployment, firmware, physical delivery and heart rate are still pending. No credentials should be committed or copied into chat.
