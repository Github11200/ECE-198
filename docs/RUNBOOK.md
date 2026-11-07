# Run the Nov. 11 progress demo

## Start the dashboard

For the expanded exercise menu, station/participant assignments, and report definitions, see [EXERCISES.md](EXERCISES.md). The original curl replay below remains the fallback. Use [FRONTEND_API.md](FRONTEND_API.md) when connecting a teammate's website.

Open the project directory in VS Code and run this in its terminal. On Windows, use `py` instead of `python` if that is how you start Python.

```sh
python app.py
```

After building the new frontend with `start-frontend.cmd` (or `npm.cmd --prefix frontend ci` followed by `npm.cmd --prefix frontend run build`), open [http://127.0.0.1:8000](http://127.0.0.1:8000). Choose **Admin login**, enter any demo values, and use **Prepare a session**. Select the exercise, pose input, participant count, IDs, and per-lane targets. The Admin Panel uses the current real backend. The login is demo navigation only; participant programme pages retain illustrative records.

The original walkthrough below is available at [http://127.0.0.1:8000/tracker](http://127.0.0.1:8000/tracker), or at the homepage if no frontend build exists. The demo uses Python 3.10 or later. The core app requires no package installation or internet access; building the React frontend requires Node and its locked dependencies. Keep the terminal running. Use `python app.py --port 8001` if port 8000 is busy and pass `--port 8001` to bridge commands before the subcommand.

1. Leave the five demo seats and the default targets in place. Click **Start demo replay**.
2. Wait five seconds. Select **Participant 02** to show its short-range cue. Participant 03 reaches its target and Participant 05 goes above it.
3. Click **End & save session**. Read the five summary rows, then filter for Participant 02.
4. If you have time, restart Python and open **History** to show the result persisted in `data/sessions.sqlite3`.

A five-minute presentation can give 45 seconds to the CCCARE problem, 90 seconds to this walkthrough, 60 seconds to the prototype or a one-volunteer camera demo, and the final 85 seconds to architecture, criteria and next steps. Bring the wearable prototype if the hardware team has it. Ask the teaching team whether a completed rep below the range threshold should count toward the prescribed dose.

## Three participants: ten squats each

On Leo's installed Intel laptop, start a **Live AlphaPose camera** session in the Admin Panel, then run `start-camera-intel.cmd` from the project folder. It supplies the already verified environment and GPU arguments. Start it again for each new camera session; keep its terminal open while tracking. It does not start a session by itself.

1. Select **Squats**, **Live AlphaPose camera**, and **3** participants. Assign P01, P02, P03 to lanes 1, 2, 3 and set each target to **10**. Start the session, then run the installed Intel GPU camera bridge from [WINDOWS_ALPHAPOSE.md](WINDOWS_ALPHAPOSE.md#intel-gpu-mode) with `--show-camera`.
2. Use the labeled left, middle, and right thirds of the preview. Each person stays in their lane. Move the camera back to include all three full bodies, with a side view of each person's right hip, knee, and ankle. Start standing.
3. Each person completes ten squat attempts, returning to standing between attempts. Current demo criteria: stand/return at knee angle >=160 degrees, attempt begins at <=130 degrees, range reached at <=100 degrees. A completed short attempt still counts and is marked short. Compare against a manual count; these squat criteria have not yet been validated on real volunteers.
4. When everyone finishes, click **End & save session**. Targets do not automatically end the session. In the expanded History entry, click **Open workout report / print**. The generated report contains actual per-person dose, full/short counts, range score, tracking coverage, review notes, and per-rep angles. Use **Print / save as PDF** to export it.
5. Stop the camera bridge with Ctrl+C. Completed results and printable reports remain available after restarting the server.

In the new Admin Panel, **View live session** / **Open monitor** shows per-lane reps and cues. Closing that dialog keeps tracking active. **End & save session** opens the report summary; **Session history** retains it across reloads/restarts. Starting a new camera session still requires restarting the bridge for its new session ID.

## Try a real AlphaPose input

### Install and smoke-test AlphaPose

For Leo's installed Windows CPU environment and verified commands, see [Windows AlphaPose setup](WINDOWS_ALPHAPOSE.md).
That guide also records the optional Intel GPU mode, which improved the initial live preview to about 12–13 processed frames/s on Leo's laptop. End-to-end latency and rep accuracy still require measurement.

Keep AlphaPose in a sibling directory and its Python dependencies in a separate environment. Use an NVIDIA/CUDA machine from the team if available. Start early enough to get model and detector weights. For a CPU trial, follow upstream's CPU build instructions and try `--gpus -1`. Measure speed before using it in the presentation.

1. Clone [AlphaPose](https://github.com/MVIG-SJTU/AlphaPose) and use commit `c60106d19afb443e964df6f06ed1842962f5f1f7`, whose writer interface this bridge follows.
2. Follow the [AlphaPose install guide](https://github.com/MVIG-SJTU/AlphaPose/blob/master/docs/INSTALL.md). For Windows, read the Windows section and use `--sp`. Download the COCO FastPose ResNet-50 checkpoint from the [model zoo](https://github.com/MVIG-SJTU/AlphaPose/blob/master/docs/MODEL_ZOO.md) into `pretrained_models/fast_res50_256x192.pth`. Also install the weights for the default YOLO detector as described in the install guide.
3. Confirm AlphaPose alone works from its checkout. From the AlphaPose directory, run this single line with the AlphaPose environment active.

```sh
python scripts/demo_inference.py --cfg configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml --checkpoint pretrained_models/fast_res50_256x192.pth --webcam 0 --sp --vis
```

### Connect the webcam to the dashboard

Use a fixed camera, good lighting and one consenting teammate. Sit in frame with the right shoulder, elbow and wrist visible. Close any app using the webcam. Start the dashboard in one terminal. In the dashboard select **Live AlphaPose camera**, choose **1** participant, and start the session. Open a second terminal from this project directory and activate the AlphaPose environment.

```sh
python alphapose_bridge.py camera --repo ../AlphaPose
```

Append `--gpus -1` for a CPU trial or `--index 1` to select a second camera. Use `--show-camera` to also open AlphaPose's native view. Begin with a lowered arm. Try a full curl, a shortened curl and an obstructed wrist. Finish the session on the dashboard, then press Ctrl+C in the camera terminal.

For five volunteers, seat them left to right in five equal image-width lanes. Keep each person's detected box center inside their lane. A lane with two detections or no detection reports no clear view. Use the same participants in their assigned seats throughout a session.

### Rehearse with a real pose export

Run AlphaPose's standard CLI with `--video PATH_TO_CLIP` in place of `--webcam 0` on a short consenting teammate clip. Record its image width and fps. The CLI writes `alphapose-results.json` under its output directory. Then start an **AlphaPose JSON replay** session in the dashboard and run the bridge from the project directory.

```sh
python alphapose_bridge.py recording path/to/alphapose-results.json --width 1280 --fps 15
```

Replace the width and fps with the source clip's values. The 17-joint COCO export must contain `image_id`, `box` and `keypoints` for each detection. Use camera mode only for the live input and JSON replay for a clip.

## Follow the code

| Question | Open this |
| --- | --- |
| What does AlphaPose produce? | `alphapose_bridge.py` → `writer_detection` turns each joint into an x, y, confidence triple |
| How does one curl become one rep? | `pose.py` → `elbow_angle` and `Curl.observe` |
| Where is the session managed? | `app.py` → `SessionService` |
| Where is it saved? | `database.py` → `save` and `history` |
| How does the browser render the data? | `web/app.js` → `poll` and `renderMonitor` |
| How can the wearable read it? | `publish_feedback.py` → `convex/http.js` → [Wearable handoff](WEARABLE.md) |

### Work through one rep

Subtract the elbow position from both the shoulder and wrist positions. These two vectors point out of the elbow. The dot product divided by the product of their lengths gives the cosine of the elbow angle. A near-straight arm gives an angle close to 180°.

Try the sequence **165° → 110° → 60° → 160°**. At 165°, the state is armed. At 110°, it begins an attempt. At 60°, it records the smallest angle so far. At 160°, it counts one completed attempt and classifies its range. Replacing 60° with 95° gives one shortened attempt. Losing the wrist mid-rep clears the incomplete attempt. These demonstration thresholds are easy to change in `pose.py`. Reaching the target is based on completed attempts.

For a small change you can own, edit a participant's target, run the replay, and predict how the dashboard's final cue changes. Then open the browser's Network tab and examine the JSON from `GET /api/session`. Use `python -m unittest -v` to rerun the bundled checks.

### API map

| Endpoint | What goes in or comes out |
| --- | --- |
| `POST /api/session/start` | `source` and a list of integer `targets` in seat order |
| `GET /api/session` | The active session, roster, latest pose-frame number, current counts and cues, or `null` |
| `POST /api/pose` | `session_id`, increasing `frame`, and one COCO keypoint array or `null` per seat |
| `POST /api/session/finish` | `session_id`. The server returns the saved result even if the browser retries the same request |
| `GET /api/history` | Up to 30 finished sessions and participant summaries |

Assign each numbered participant ID to a lane before starting. Reuse that participant ID across stations/sessions to look up history; the lane number is separate. Keep each person in their assigned lane while a session runs. The backend accepts P01–P99 but processes at most five lanes in one active session. A 30-person roster requires rotating groups or additional tested station capacity. Future sessions with identifiable participants need authorized identity and access controls.

## Measure on the team's laptop

| Test | Record |
| --- | --- |
| Rep counts | Manually count 20 attempted curls per volunteer. For each, calculate `abs(tracked − manual) / manual × 100%`. Record missed and extra reps separately as well |
| Range cue | Label full and short ranges before comparing with the prototype. Count disagreements / scored attempts, with occluded attempts reported separately |
| Five people | Have five volunteers perform different counts, all in frame. Check seat mapping and final counts. Repeat once with an obstruction and once with two people briefly in one lane |
| Latency | Film the exercise and dashboard together at a known high frame rate. Count frames between a threshold crossing and the matching visible update. Report median and p95 over repeated reps and measure the wearable separately |
| Cost | List the parts used, whether each was owned or borrowed, and any new purchases against CAD $50 |

If accuracy or latency misses a target, record the result for the teaching team. The synthetic replay verifies software behavior. Live camera and wearable performance depend on the rehearsal.

## Put the code on GitHub

If you have a team repository already, start from a clone, create a branch and copy these files in after checking for filename conflicts. Commit and push the branch. If you are starting from the downloaded ZIP and a new empty private GitHub repository, extract it, open a terminal in the project directory, and run these commands.

```sh
git init -b main
git add .
git commit -m "Build CCCARE exercise tracking MVP"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Replace the example URL with your team's repo URL. If using the existing local Git checkout, it already has commits. Begin at `git remote add origin`. Commit code and demo fixtures only. Keep database files, pose exports, model checkpoints and deployment secrets local.
