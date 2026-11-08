# Stack, participant identity, and session measurements

This records the current implementation and proposed next steps. The identity-marker and timed-round ideas below are not implemented.

## Current stack

| Layer | What runs |
| --- | --- |
| Website | Next.js App Router, React, TypeScript and CSS in `frontend/` |
| Build | Node/npm compiles a static export in `frontend/out/` |
| Runtime | `app.py` serves that export and the JSON API on the same local origin; no Next.js/Node server is required after building |
| Pose | The pinned AlphaPose FastPose/YOLO models; optional OpenVINO runs their exported networks on the Intel GPU |
| Camera input/drawing | OpenCV supplies frames and draws the native preview |
| Counting and range | Python `pose.py` and `exercises.py`, with independent state per active participant |
| Completed history | SQLite through `database.py`; printable reports through `reports.py` |
| Wearable feedback | Optional Python publisher and Convex HTTPS latest-feedback relay; physical delivery/deployment still needs integration |

The Admin Panel reads actual API results. Demo login performs navigation only. The participant programme/progress pages still contain labeled illustrative records.

## Identity is distinct from body tracking

The current bridge maps each detected body's box center to a fixed image-width lane. The instructor assigns a numbered participant ID to that lane. A lane is not a recognized person. Crossing lanes can transfer measurements to the wrong assigned ID. Multiple detections in one lane are rejected.

The current API supports at most five lanes in one active session. IDs P01–P99 are a roster-ID range, not simultaneous camera capacity. More people require a tested capacity change, rotating smaller groups, or future multi-camera/station integration. Markers alone do not solve occluded joints or insufficient image detail. Multiple concurrent stations/combined history are not implemented in this single-session server.

Proposed progression:

1. Validate three volunteers in fixed lanes against manual rep/range labels, then test five under the same conditions.
2. Keep the participant ID with the person between sessions; pair the wearable to that same ID. Visible text/color can help the instructor confirm the assignment.
3. Prototype a printed ArUco or AprilTag on a camera-visible body location. Map its numeric marker ID to the roster participant and paired wearable. Associate the marker with the detected body and validate that association, including turns and overlap. A detected marker is not yet a tracked person.
4. If free movement is needed, test body tracking plus marker-based identity checks. On ambiguous associations, report identity unavailable rather than silently assigning another participant's measurements.

Example future binding: `marker 23 -> P07 -> wearable paired to P07`. Where to mount a marker and its required visible size must be tested at the actual camera distance, view angle, exercise, lighting and frame rate. Do not assume a tiny wrist display is readable from a group camera view.

Wearable color emission is an experimental option. The expected engineering problems are visibility/occlusion, exposure and lighting changes, small image area, and distinguishing enough colors. This is an engineering assessment, not a measured failure on our setup. Color can remain a helpful human-facing cue while an explicit ID handles machine identity. An OLED or wireless device ID alone does not bind a camera skeleton to a person automatically.

Primary references: [OpenCV ArUco detection](https://docs.opencv.org/4.7.0/d5/dae/tutorial_aruco_detection.html) returns marker IDs and corners; [AprilTag](https://april.eecs.umich.edu/software/apriltag) describes printable markers and tag identity. Upstream [AlphaPose tracking options](https://github.com/MVIG-SJTU/AlphaPose/blob/master/trackers/README.md) include temporal body tracking; the current CCCARE bridge does not enable those trackers or convert their track IDs to roster identities.

## Reps and time answer different questions

For repeated movements such as curls, squats and knee extensions, retain continuous counting and range measurement. A 30-second round can be an additional session boundary: count all observable completed attempts within that period, then summarize them. It should not mean examining a single frame every 30 seconds. Joint observations throughout each movement are needed to recognize a full cycle.

Keep these measurements separate:

- Completed attempts, including completed short attempts.
- Attempts reaching the fixed range criterion, plus short attempts and per-rep angles.
- Tracking coverage and discarded incomplete attempts.
- Session/round duration. Start/end timestamps already exist; automatic timed rounds are not implemented.

Example: ten completed attempts, seven reaching the range criterion and three short gives a 70% range score. That is neither overall technique quality nor tracking confidence. A planned future 30-second round could contain the same ten attempts; both dose and duration can be reported. Dedicated scoring for static holds would use hold duration and would require separate logic.

For the current demonstration, keep the ten-rep setup while validating count and range accuracy. Optional timed rounds can be added after the counting path is reliable; no counter thresholds, five-lane capacity, scoring rules, marker detection, or session end conditions were changed during the visual refinement.
