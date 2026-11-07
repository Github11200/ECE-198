# AlphaPose on Eric's Windows laptop

Installed and verified November 7, 2026, using the NVIDIA GeForce RTX 4050 Laptop GPU (6 GB). System Python remains separate from the project environment.

## Run

From this repository in PowerShell:

```powershell
.\start-dashboard.cmd
```

Open http://localhost:8000, select **Live AlphaPose camera**, choose one participant, and start the session. The **CCCARE Camera** window opens automatically after the pose models load and shows the camera with skeleton overlays. Close other apps using the webcam first.

Close the preview window or press Esc/Q inside it to pause the camera. Click **Open camera window** in the dashboard to resume, or **Restart camera window** if the running preview needs to restart. **End & save session** closes the camera process automatically. Stopping the dashboard also closes its camera process.

The launcher uses `.venv\Scripts\python.exe` directly; environment activation is unnecessary. To use a second webcam, start the dashboard with `.\start-dashboard.cmd --camera-index 1`. To use another server port, run `.\start-dashboard.cmd --port 8001` and open that port in the browser. Camera launch follows the selected port automatically.

You no longer need to run `start-camera.cmd` separately for dashboard sessions. The dashboard owns the preview process. If a camera fails to start, its diagnostic output is in `.cache/camera.log`.

## Installed components

- `external/AlphaPose`: upstream commit `c60106d19afb443e964df6f06ed1842962f5f1f7`.
- `.venv`: Python 3.10.20, PyTorch 2.5.1+cu121, torchvision 0.20.1+cu121, plus the dependencies in `requirements-alphapose.txt`, visdom 0.2.4, cython-bbox 0.1.5, and halpecocotools 0.0.0.
- `external/AlphaPose/pretrained_models/fast_res50_256x192.pth`: COCO FastPose ResNet-50 with 17 joints, matching the bridge.
- `external/AlphaPose/detector/yolo/data/yolov3-spp.weights`: YOLO detector weights.
- `.cache/torch/hub/checkpoints`: ResNet initialization weights used by upstream model construction.

These large local directories are ignored by Git. No separate CUDA toolkit or Visual Studio installation was required. Native dependencies were built with the existing MSYS2 UCRT64 GCC compiler. The local cython-bbox build replaces its invalid Windows compiler-argument dictionary with GCC flags; the runtime algorithm is unchanged. AlphaPose's setup generated its version file; its inference source was not patched.

## Verification

- CUDA detected the RTX 4050 and successfully executed full detector and pose inference on upstream `examples/demo/1.jpg`.
- Output contained five people, each with 17 COCO joints. Results and a rendered image are in `.cache/smoke`.
- The actual camera bridge was exercised with a one-frame video made from the bundled image, substituting the video for the webcam. The running HTTP dashboard accepted pose frame 0.
- All four existing app tests passed; `uv pip check` reported all 56 installed packages compatible.

The camera-window feature adds tests for automatic launch, restarting, stale-session rejection, launch failure recovery, and shutdown when saving. The native preview is checked with the bundled image rather than the physical webcam.

The physical webcam and live exercise accuracy have not been tested. Sample-image inference is not a live performance measurement.

## Camera frame rate fix

The bridge and optional wearable relay now connect to `127.0.0.1`, matching the server's IPv4 bind. On this laptop, `localhost` incurred an IPv6 connection retry on every request: five-request measurements averaged 2.012 seconds per request versus 0.006 seconds with the IPv4 address. This synchronous delay blocked the camera writer and backed up inference.

A repeated five-person sample with inference, dashboard updates, and the preview enabled measured about 9.0 pose updates per second after the change; the old connection measured about 0.44 updates per second in a shorter run. These are sample measurements excluding model startup, not a guaranteed webcam rate. The pose model and detector resolution are unchanged. The preview now shows a rolling **Pose: … FPS** readout. Restart the camera session to load the fix.

## Reinstall

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-alphapose.ps1
```

The script requires `uv`, Git, curl, tar, and the existing GCC compiler on PATH. It creates the local environment, installs GPU dependencies, builds native packages, and downloads and verifies model files. It does not activate a camera. The pose and detector hashes record the files used in this installation, matching the project's earlier laptop setup; they are not independently published upstream checksums.

Sources: [upstream installation guide](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/INSTALL.md), [model zoo](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/MODEL_ZOO.md).
