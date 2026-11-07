# Wearable handoff for Erik and Jinay

The first band is manually paired with participant `P01`. Erik can put the ID in the firmware or use a setup input. Jinay can read a compact participant-specific snapshot using HTTP over Wi-Fi. The laptop still scores every pose and saves history in SQLite. The firmware can use the same contract with synthetic or camera inputs.

With station assignments, P01 is a participant ID, independent of the camera lane. Keep the same participant ID when that person moves stations. The updated relay source accepts IDs P01–P99 and optional `exercise`/`station` labels; deploying and physically verifying those updates is still pending. It remains one latest-feedback snapshot for one laptop relay, not a multi-station session-history service. See [the frontend/API handoff](FRONTEND_API.md) for the storage distinction.

## Optional Convex deployment

Use a dedicated Convex dev project for the prototype. If the team already has a deployment, review and merge these functions into its existing schema and routes before applying them.

1. Run `npm ci` in the project directory, then `npx convex dev`. Select a cloud dev deployment so the wearable can reach its HTTPS URL.
2. Generate two different random secrets. Set `FEEDBACK_PUBLISH_TOKEN` and `FEEDBACK_READ_TOKEN` on the deployment. Use the same publish token in the laptop terminal's environment and configure the read token privately on the demo wearable. Keep both outside Git.
3. With the dashboard server running, start the optional relay in another terminal.

```sh
python publish_feedback.py --url https://YOUR-DEPLOYMENT.convex.site
```

The relay publishes changed cues and sends a heartbeat every two seconds during a session. After five seconds without an update, the read endpoint returns inactive. Finishing a session sends an inactive update. A single laptop relay owns this demo deployment.

## Read on the band

Request `GET /feedback?participant_id=P01` on the `.convex.site` URL. Send the read token as `Authorization: Bearer <token>`. Start at two polls per second and measure the visible delay before adjusting.

```json
{
  "active": true,
  "session_id": "example-session",
  "source": "replay",
  "updated_at_ms": 1794060000000,
  "id": "P01",
  "reps": 2,
  "target": 4,
  "cue": "Full range on last rep"
}
```

If `active` is false or Wi-Fi fails, show a short status such as **Waiting for session**. Show the count and one short cue when active. The publish path uses a separate write token and stores only numbered demo IDs, counts and cues.

## Next team integration

- Confirm the band has usable Wi-Fi hardware. The course's UNO R4 Minima can prototype display and sensor wiring, and a verified Wi-Fi shield or an available ESP32 can handle wireless delivery.
- Confirm the actual OLED model before depending on screen colors. Keep manual pairing for the first end-to-end test.
- Send any future heart-rate summary with its session ID and participant ID. Agree on time window, units, and handling of missing readings before adding a write endpoint or SQLite field.
- Use the dashboard's participant preview to compare the band count and cue while one teammate exercises.
