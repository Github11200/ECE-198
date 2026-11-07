# Wearable handoff for Erik and Jinay

## Who supplies what

| Owner | Integration boundary |
| --- | --- |
| Leo | Camera/scoring, stable participant IDs, local session API and SQLite history, and `publish_feedback.py` producing the agreed feedback payload |
| Jinay | Team Convex deployment/schema/route setup, private token configuration, wearable networking/receiver and OLED update logic |
| Erik | Confirmed networking hardware, display wiring, and device-to-participant pairing with Jinay |

Leo's next integration step is to provide this contract and the publisher source, agree on a first paired ID (P01), and run the publisher when Jinay has supplied the team's `.convex.site` URL and configured credentials privately. Test one participant's count/target/cue against the dashboard before scaling. The cloud project and firmware are not prerequisites for testing camera tracking or saving reports locally.

The existing receiver contract uses HTTP polling every 500 ms. It does **not** implement a persistent event subscription. Convex supports reactive subscriptions in supported clients (for example [its WebSocket-based JavaScript client](https://docs.convex.dev/client/javascript/overview)). If the team's requirement specifically needs event-driven wearable delivery, Jinay must implement a suitable authorized query/transport and receiver for the actual board. The current `feedback.read` is an internal query exposed through the HTTP GET route, not an existing public subscription endpoint. Do not claim the wearable is listening for push events until that path has been built and tested.

The first band is manually paired with participant `P01`. Erik can put the ID in the firmware or use a setup input. Jinay can read a compact participant-specific snapshot using HTTP over Wi-Fi. The laptop still scores every pose and saves history in SQLite. The firmware can use the same contract with synthetic or camera inputs.

With station assignments, P01 is a participant ID, independent of the camera lane. Keep the same participant ID when that person moves stations. The updated relay source accepts IDs P01–P99 and optional `exercise`/`station` labels; deploying and physically verifying those updates is still pending. It remains one latest-feedback snapshot for one laptop relay, not a multi-station session-history service. See [the frontend/API handoff](FRONTEND_API.md) for the storage distinction.

## First wearable milestone

Make one paired P01 band display **reps / target** and **one short cue** from the same session shown on the laptop. Use the synthetic replay first to separate the networking/display test from camera calibration. Then repeat with one volunteer. Heart-rate upload and a final-score screen are later integration tasks.

The wearable mainly **receives** exercise feedback. The laptop does pose estimation and scoring. During this milestone the wearable sends only an authenticated HTTP read request containing its assigned participant ID. It does not send rep counts, angle judgments, or scores back to the laptop.

Convex is the hosted database/functions layer between the laptop and Wi-Fi wearable. We use it as one shared latest-feedback mailbox, not as the camera processor. SQLite still stores completed reports locally. The [Convex HTTP actions](https://docs.convex.dev/functions/http-actions) expose that mailbox to firmware over ordinary HTTPS.

## Deployment checklist for Jinay

Use a dedicated Convex dev project for the prototype. If the team already has a deployment, review and merge these functions into its existing schema and routes before applying them.

1. Confirm the actual Wi-Fi-capable board and OLED model with Erik. An UNO R4 Minima alone has no Wi-Fi; use the team's confirmed networking hardware. No board-specific firmware is assumed by this contract.
2. In the project directory, run `npm.cmd ci`, then `npx.cmd convex dev` on Windows. Use the team's existing dev project if there is one. Otherwise select a cloud dev deployment so the wearable can reach its HTTPS URL. Merge/review the functions before deploying into a pre-existing project.
3. Generate two different random secrets. Set `FEEDBACK_PUBLISH_TOKEN` and `FEEDBACK_READ_TOKEN` on the deployment. Use the same publish token in the laptop terminal's environment and configure the read token privately on the demo wearable. Keep both outside Git and chat. The band receives the read token, not the laptop's publish token.
4. Deploy the updated schema/functions before starting the updated publisher, because the payload now has cue codes and range percentage.
5. With the dashboard server running, start the optional relay in another terminal.

```sh
python publish_feedback.py --url https://YOUR-DEPLOYMENT.convex.site
```

The relay publishes changed cues and sends a heartbeat every two seconds during a session. After five seconds without an update, the read endpoint returns inactive. Finishing a session sends an inactive update. A single laptop relay owns this demo deployment.

6. Start the five-person synthetic replay on the dashboard. First request P01 from the cloud endpoint on a computer and compare count/target/cue with the dashboard. Then make the band read that same endpoint and display those fields.
7. End/save the session and confirm that the band leaves active feedback. Test a dropped Wi-Fi connection and a stopped laptop relay. Record actual display delay separately from camera-to-dashboard latency.

The local contract/source tests pass, but this checkout has not been configured/deployed to Jinay's cloud project and physical band delivery has not been verified. Jinay supplies the team's `.convex.site` deployment URL and configures its tokens privately.

## Read on the band

Request `GET /feedback?participant_id=P01` on the `.convex.site` URL. Send the read token as `Authorization: Bearer <token>`. Start at two polls per second and measure the visible delay before adjusting.

```json
{
  "active": true,
  "session_id": "example-session",
  "source": "camera",
  "exercise": "squat",
  "station": "Station B",
  "updated_at_ms": 1794060000000,
  "id": "P01",
  "reps": 3,
  "target": 8,
  "cue": "Check your range with the instructor",
  "cue_code": "CHECK_RANGE",
  "display_text": "Check range",
  "range_score": 67
}
```

Recommended OLED content:

```text
P01   Squats
3 / 8 reps
Check range
```

Use `cue_code` for firmware logic and `display_text` for the short message. All provided display messages are at most 16 characters. Keep `cue` as a backward-compatible longer dashboard message. Do not derive device logic by searching that English string.

| `cue_code` | `display_text` | Meaning |
| --- | --- | --- |
| `READY` | Ready | Usable pose, no completed attempt yet |
| `RANGE_OK` | Range reached | Last completed attempt met the fixed range criterion |
| `CHECK_RANGE` | Check range | Last completed attempt fell below that criterion |
| `TRACKING_LOST` | Tracking lost | Current pose unavailable; this is not a judgment about the participant's form |
| `TARGET_REACHED` | Target reached | Completed attempt count equals the target |
| `ABOVE_TARGET` | Above target | Completed attempt count exceeds the target |

Tracking loss takes priority over range/dose cues, and a short-range last attempt takes priority over target completion. The count/target remains visible alongside the cue, so both pieces of information can be communicated.

`range_score` is the running percentage of completed attempts that reached the exercise's fixed range criterion. It is null before any completed attempts. For example, 80 means 8 of 10 reached that range; it is not a medical grade, tracking confidence, or an overall technique score. The first OLED milestone does not need to show it. The final report stays on the dashboard/SQLite; finishing currently deactivates the relay rather than sending a separate finished-session screen.

Avoid vague messages such as "Squat better" or unsupported judgments such as "Back posture wrong." Current scoring measures the listed joint-angle criteria and tracking availability.

Firmware loop, independent of board/library:

```text
Every 500 ms:
  GET /feedback?participant_id=<paired ID>, with the read token
  If the request fails: display "Connection lost"
  Else if active is false: display "Waiting session"
  Else: display reps/target and display_text
```

When inactive or disconnected, clear the previous live cue instead of presenting a stale result as current. The cloud read endpoint marks feedback inactive after five seconds without a laptop update.

## Next team integration

- Confirm the band has usable Wi-Fi hardware. The course's UNO R4 Minima can prototype display and sensor wiring, and a verified Wi-Fi shield or an available ESP32 can handle wireless delivery.
- Confirm the actual OLED model before depending on screen colors. Keep manual pairing for the first end-to-end test.
- Send any future heart-rate summary with its session ID and participant ID. Agree on time window, units, and handling of missing readings before adding a write endpoint or SQLite field.
- Use the dashboard's participant preview to compare the band count and cue while one teammate exercises.

Future sensor messages could include `session_id`, `participant_id`, `observed_at_ms`, and `heart_rate_bpm` when a valid sensor reading exists. **There is no heart-rate upload endpoint in this prototype yet.** Do not send synthetic or missing readings as actual heart-rate measurements.
