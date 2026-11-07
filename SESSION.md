# CCCARE handoff to the Windows laptop

Updated: November 7, 2026 (America/Toronto).

## Latest laptop checkpoint — November 7

This section supersedes the original computer's pending-check list below.

- Laptop checkout: `C:\Users\leosi\Desktop\ECE198 CCARE\ECE-198`, branch `leo/exercise-tracker`, tracking Leo's fork. The published handoff commit is `320b60e41c5f97338a66389e6c26aca3a368db21`.
- Leo confirmed the replay/save/restart/History checkpoint himself. Codex did not verify the browser workflow; Chrome control was declined. The four bundled unit tests passed on the laptop's system Python 3.14.5.
- Hardware query reported Intel Arc 140V graphics and an Intel Core Ultra 9 288V CPU. AlphaPose is installed for CPU inference; NVIDIA/CUDA was not installed.
- AlphaPose is a sibling checkout at `..\AlphaPose`, pinned to `c60106d19afb443e964df6f06ed1842962f5f1f7`.
- Local Python 3.10.21 is in `..\.python`; the isolated environment is `..\.venv-alphapose`. The system Python remains separate. Leo explicitly asked Codex to execute the installation commands.
- Installed CPU PyTorch 1.13.1, torchvision 0.14.1, NumPy 1.23.5, and all dependencies declared by the pinned AlphaPose setup. `uv pip check` passed for all 52 installed packages.
- Built `halpecocotools==0.0.1` and `cython-bbox==0.1.5` with the existing `C:\msys64\ucrt64\bin\gcc.exe`. A local build-only patch corrected cython-bbox's Windows compiler arguments; `MS_WIN64` was defined for both helpers. No custom CUDA extensions were enabled. Bounding-box overlap and mask encode/decode checks passed.
- Downloaded the COCO FastPose checkpoint, YOLOv3-SPP detector weights, and the official torchvision ResNet50 initialization weights. These remain local, outside the tracker repository.
- AlphaPose's CLI help loaded. CPU inference on the upstream sample `examples/demo/1.jpg` completed and exported five detections, each with 51 values (17 COCO joints). The rendered skeleton overlay was visually checked. This is an upstream sample-image check, not five-person camera validation.
- That one sample reported approximately 0.503 seconds for detection and 0.606 seconds for pose inference. These are sample processing times, not a camera-to-dashboard latency measurement or evidence of meeting 100 ms.
- The editable install regenerated AlphaPose's `alphapose/version.py`; its inference code was not edited. Tracker application code was not changed.

Working launch commands and local build notes are in [Windows AlphaPose setup](docs/WINDOWS_ALPHAPOSE.md). Next: standalone webcam on CPU, then one participant through the live bridge, full/short curls, and saving the session. Live webcam access, live bridge delivery, actual exercise counts/range, five-person live tracking, latency, and wearable delivery remain unverified.

## Read this first, next Codex

Leo is moving to a Windows laptop and wants to learn by doing one step at a time. Explain what each command does, wait for its result, then continue. The requested order is to verify a synthetic replay survives a server restart in History, then get one consenting volunteer tracking through AlphaPose. The immediate priority changed to preserving this project and moving it to the laptop before leaving.

Read `README.md`, `docs/RUNBOOK.md`, and `docs/WEARABLE.md`, then inspect the actual laptop environment. Paths and available software on the original computer do not establish what is installed on the laptop.

## Transfer location

Leo authorized Codex to perform the transfer. The team repository gives the signed-in account `leoyang812` read-only access, so a fork was created at <https://github.com/leoyang812/ECE-198> for the handoff.

- Working checkout on the original computer: `D:\Users\Leo\Desktop\cccare-exercise-tracker\ECE-198`.
- Working branch: `leo/exercise-tracker`.
- Publish remote (`origin`): `https://github.com/leoyang812/ECE-198.git`.
- Team remote (`upstream`): `https://github.com/Github11200/ECE-198.git`.
- Laptop clone URL: use the fork and branch in section 4 below.

Check the actual Git state and GitHub branch before assuming publication succeeded. The commands in sections 1-3 are the transfer recipe; they are not steps to repeat on the laptop. No pull request or merge is required to continue on the laptop.

## What was actually verified

- Original project folder: `D:\Users\Leo\Desktop\cccare-exercise-tracker\cccare-exercise-tracker`.
- The folder is an extracted project, with no `.git` directory. `git status` reports that it is not a repository.
- Team repository supplied by Leo's screenshot: <https://github.com/Github11200/ECE-198>. The screenshot shows it as public.
- `git ls-remote --symref https://github.com/Github11200/ECE-198.git HEAD` confirmed default branch `main` and HEAD `60b2a2cfee7e64c1bd5f4c683ae08caf71d4519f` during this session.
- Python on the original computer: 3.11.9. Git and GitHub CLI are available there.
- `python -m unittest -v` passed all four existing tests. The persistence test saves a generated replay in a temporary SQLite database, creates a new service using that database, and verifies the saved result. It does not restart a real server process or exercise a browser.
- `data/sessions.sqlite3` exists on the original computer. Its existence alone does not establish which sessions it contains.
- No tracker behavior was changed during this conversation. This handoff document was added, and one trailing space in `alphapose_bridge.py` was removed to pass Git's whitespace check.

Still pending: user confirmation that the dashboard opens; manual replay/save/server restart/History verification; laptop GPU and Python checks; AlphaPose source extraction; dependency installation; model downloads; standalone inference; live bridge; one-volunteer verification. Do not report any of those as completed.

Codex created `leo/exercise-tracker` in the separate working checkout above and copied the project there. All four existing tests passed again in that checkout, and all 19 copied code/document files matched the original source. The database folder was excluded. Inspect Git and the fork for the transfer commit and published branch. No pull request has been created; the team repository's `main` branch has not been changed.

## Before leaving: transfer the code through a branch

A branch holds the work. A commit records a local snapshot. A push uploads the commits to GitHub. A pull request is for reviewing and merging the branch into `main`; it is not needed to check out the branch on another computer.

Start from a clone of the existing team repository so its history is preserved. The commands below make a separate `ECE-198` folder beside the original project. They leave the original project and local database available. Run each block separately, and stop if any command fails. GitHub may ask you to sign in. The fork is used for publishing because the current account has read-only access to the team repository.

### 1. Clone and create the branch

Run in PowerShell on the original computer:

```powershell
$handoffSource = 'D:\Users\Leo\Desktop\cccare-exercise-tracker\cccare-exercise-tracker'
$teamCheckout = Join-Path (Split-Path $handoffSource -Parent) 'ECE-198'
if (Test-Path -LiteralPath $teamCheckout) { throw 'ECE-198 already exists. Inspect that checkout before continuing.' }
git clone https://github.com/Github11200/ECE-198.git $teamCheckout
if ($LASTEXITCODE -ne 0) { throw 'Clone failed. Stop here.' }
Set-Location -LiteralPath $teamCheckout
git switch -c leo/exercise-tracker
if ($LASTEXITCODE -ne 0) { throw 'Branch creation failed. Stop here.' }
git remote rename origin upstream
git remote add origin https://github.com/leoyang812/ECE-198.git
```

### 2. Copy only the project code and documentation

Continue in the same PowerShell terminal so the variables above still exist:

```powershell
$projectEntries = @(
    '.gitignore', 'README.md', 'SESSION.md',
    'app.py', 'database.py', 'pose.py', 'alphapose_bridge.py',
    'publish_feedback.py', 'test_mvp.py',
    'package.json', 'package-lock.json', 'web', 'docs', 'convex'
)
foreach ($entry in $projectEntries) {
    Copy-Item -LiteralPath (Join-Path $handoffSource $entry) -Destination $teamCheckout -Recurse -Force -ErrorAction Stop
}
python -m unittest -v
git add .
git diff --cached --stat
git status --short
```

Review the staged list. It should contain code, static assets, and documentation. The copied README replaces the repository's starter README on this branch. The source folders were inspected during this handoff; recheck them if files have been added since then. The allowlist excludes the original `data` folder, environments, camera clips, and downloaded model files.

If Git asks for your name/email when committing, configure your own identity for this checkout using `git config user.name` and `git config user.email`, then retry the commit.

### 3. Commit and push

After the tests pass and the staged files look correct:

```powershell
git commit -m "Add CCCARE tracker and laptop handoff"
git push -u origin leo/exercise-tracker
```

If the commit fails, fix that error before pushing. After the push succeeds, select `leo/exercise-tracker` in <https://github.com/leoyang812/ECE-198> and confirm that `app.py` and `SESSION.md` appear. Do not force-push. A pull request from the fork to the team repository can wait until the work is ready for team review.

### 4. On the laptop

Open PowerShell in the parent folder where you want the project and run:

```powershell
git clone --branch leo/exercise-tracker https://github.com/leoyang812/ECE-198.git
Set-Location ECE-198
```

If the laptop already has an `ECE-198` checkout, inspect `git status` first, then fetch and switch to the branch rather than cloning over it. Commit or otherwise preserve any existing work before switching.

Open `ECE-198` as the project in VS Code/Codex and say:

> Read SESSION.md, README.md, docs/RUNBOOK.md, and docs/WEARABLE.md. Inspect this laptop. Walk me through replay persistence first, then installing the pinned AlphaPose and tracking one volunteer, one checkpoint at a time. Explain each step. Do not assume the pending checks in SESSION.md have been completed.

Git transfers code and documents. It does not transfer the ignored SQLite database, installed Python environments, AlphaPose checkout, or downloaded weights. A new laptop database starts empty. Run a new replay on the laptop to verify persistence there. To preserve the original demo history, stop the original server and copy `data/sessions.sqlite3` privately; do not overwrite an existing laptop database without checking it.

## First laptop checkpoint: replay persistence

The dashboard needs Python 3.10 or newer, and no third-party packages. Verify `python --version` on the laptop first.

1. From the `ECE-198` directory, run `python app.py` and open <http://localhost:8000>. Leave the terminal running.
2. Keep five seats and targets `2, 4, 1, 3, 2`. Click **Start demo replay** and wait at least five seconds.
3. Expected rep counts for P01 through P05: `2, 3, 1, 1, 3`. P02 has two short-range attempts. P04 has one completed attempt because a generated obstruction discards an incomplete attempt.
4. Click **End & save session**. Record the timestamp and five summary rows in History.
5. Press Ctrl+C in the server terminal. Run `python app.py` again with the same default database path. Refresh the browser and select **History**.
6. Confirm the saved session and counts still appear. The active session should be empty after restart. Restarting before clicking **End & save session** does not save an unfinished session.

If port 8000 is busy, use `python app.py --port 8001` and <http://localhost:8001>. The bridge's matching option must precede the subcommand: `python alphapose_bridge.py --port 8001 camera --repo ../AlphaPose`.

## Second laptop checkpoint: get the AlphaPose source

Required upstream commit: `c60106d19afb443e964df6f06ed1842962f5f1f7`. The bridge follows that version's writer interface. Keep AlphaPose beside the team project so `../AlphaPose` resolves correctly:

```text
your-work-folder/
  ECE-198/
    app.py
    alphapose_bridge.py
    SESSION.md
  AlphaPose/
    setup.py
    scripts/demo_inference.py
    configs/
    pretrained_models/
    detector/
```

Choose one source-download method.

### ZIP extraction

1. Download the [pinned AlphaPose ZIP](https://github.com/MVIG-SJTU/AlphaPose/archive/c60106d19afb443e964df6f06ed1842962f5f1f7.zip).
2. In Windows File Explorer, right-click the ZIP and choose **Extract All**.
3. Find the extracted folder that directly contains `setup.py`, `scripts`, `configs`, and `alphapose`. Rename that folder `AlphaPose` and place it beside `ECE-198` as shown above. Avoid an extra nested `AlphaPose/AlphaPose-<hash>/` folder.
4. From `ECE-198`, run `Test-Path ..\AlphaPose\scripts\demo_inference.py`. It must print `True`.

### Git alternative

From the `ECE-198` directory:

```powershell
git clone https://github.com/MVIG-SJTU/AlphaPose.git ../AlphaPose
git -C ../AlphaPose checkout c60106d19afb443e964df6f06ed1842962f5f1f7
git -C ../AlphaPose rev-parse HEAD
Test-Path ../AlphaPose/scripts/demo_inference.py
```

The detached HEAD in this separate AlphaPose checkout is expected: it pins the dependency to a specific commit. The team project stays on its own branch. Do not copy AlphaPose into the team repository.

## Third laptop checkpoint: environment and weights

Downloading source does not install AlphaPose or its pretrained models. Next Codex should gather the actual laptop GPU and environment details before selecting PyTorch/CUDA packages. Check Windows Task Manager's Performance/GPU page, `nvidia-smi` if available, `python --version`, `py -0p` if available, and whether Conda is installed. A missing `nvidia-smi` command alone does not prove the laptop has no NVIDIA GPU.

Use a separate AlphaPose environment. The tracker requires Python 3.10+, so use a compatible interpreter for running `alphapose_bridge.py` as well. Do not blindly copy upstream's historical Python 3.7 example or install the newest PyTorch without checking compatibility with this pinned checkout. Consult the [official installation guide at the pinned commit](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/INSTALL.md) and official PyTorch instructions to choose matching packages for the laptop. Installation commands and performance have not been validated on this laptop yet.

On Windows, upstream disables its optional custom CUDA extensions by default and recommends FastPose models. Some dependencies may still require Microsoft C++ build tools. Follow the Windows-specific instructions rather than running Linux commands such as `sudo`, `apt-get`, or `export` in PowerShell.

Download these two models separately, using upstream links:

| Asset | Source | Required destination inside `AlphaPose` |
| --- | --- | --- |
| COCO Fast Pose, ResNet50, 256x192 checkpoint | [Pinned model zoo](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/MODEL_ZOO.md), MSCOCO Fast Pose / ResNet50 row | `pretrained_models/fast_res50_256x192.pth` |
| YOLOv3 SPP detector weights | [Pinned install guide, Models section](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/INSTALL.md#models) | `detector/yolo/data/yolov3-spp.weights` |

Use the 17-joint COCO model and matching config. The bridge expects exactly 17 keypoints; Halpe and whole-body models have different joint counts. Keep downloads and environments local. Convex is optional and is not needed for the camera milestone.

## Fourth laptop checkpoint: standalone inference, then one volunteer

Once installation and both weights are verified, activate the AlphaPose environment and smoke-test from the `AlphaPose` directory:

```powershell
python scripts/demo_inference.py --cfg configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml --checkpoint pretrained_models/fast_res50_256x192.pth --webcam 0 --sp --vis
```

For a CPU trial, append `--gpus -1` after confirming a compatible CPU installation. Measure actual speed before promising a live demonstration. Windows inference uses `--sp`. Close the standalone camera process before starting the bridge so it releases the webcam. If following the runbook's short-clip rehearsal, replace `--webcam 0` with `--video PATH_TO_CLIP` first and inspect its COCO output before trying the camera.

Then connect to the dashboard:

1. Terminal A, in `ECE-198`: `python app.py`.
2. Dashboard: choose **Live AlphaPose camera**, choose **1** participant, set a small target, and start the session.
3. Terminal B, in `ECE-198`, with the AlphaPose environment active:

   ```powershell
   python alphapose_bridge.py camera --repo ../AlphaPose --show-camera
   ```

   Append `--gpus -1` for a CPU trial or `--index 1` for a second camera. The bridge supplies `--sp` itself.

4. Use one consenting teammate, seated in a fixed, well-lit view. Keep the person's anatomical right shoulder, elbow, and wrist visible. Begin with the arm lowered, then try a full curl, a shortened curl, and an obstructed wrist. Compare against manual counts and confirm the dashboard changes.
5. Click **End & save session** in the dashboard, press Ctrl+C in Terminal B, and inspect History. Record the laptop GPU, Python/PyTorch versions, commands used, errors/fixes, observed counts, and whether CPU/GPU speed is usable in this file.

The bridge assigns detections to fixed horizontal lanes, not persistent person identities. With one participant, the whole image is one lane; keep other people out of view. Scale to five volunteers only after the one-person path is working.

## Code map and wearable scope

- `pose.py`: COCO joints, elbow angle, curl state machine, synthetic replay, lane assignment.
- `app.py`: local HTTP server and active session lifecycle. Active sessions live in memory.
- `database.py`: completed sessions and participant results in SQLite.
- `web/app.js`: polling, dashboard, and History UI.
- `alphapose_bridge.py`: camera adapter and COCO JSON replay.
- `publish_feedback.py` and `convex/`: optional wearable relay. `docs/WEARABLE.md` defines the contract.
- First wearable is manually paired to `P01`; UNO R4 Minima lacks built-in Wi-Fi, so verify actual networking hardware. No wearable deployment or message to teammates was performed.

Update this handoff after each verified checkpoint. Keep observed results distinct from planned work.
