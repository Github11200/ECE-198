# AlphaPose on Leo's Windows laptop

Verified November 7, 2026. This records the installed setup, alongside the general [runbook](RUNBOOK.md).

## Installed layout

```text
C:\Users\leosi\Desktop\ECE198 CCARE\
  ECE-198\             tracker, branch leo/exercise-tracker
  AlphaPose\           pinned upstream source and pretrained models
  .python\             local Python 3.10.21 runtime
  .venv-alphapose\      isolated dependencies
  .torch\              local torchvision initialization checkpoint cache
  .matplotlib\         writable matplotlib cache
  .uv-cache\           downloaded packages and build cache
  .alphapose-build\    helper build configuration, local patched source,
                       download script, and installed-packages.txt snapshot
```

AlphaPose is pinned to `c60106d19afb443e964df6f06ed1842962f5f1f7`. CPU inference uses `torch==1.13.1+cpu`, `torchvision==0.14.1+cpu`, `numpy==1.23.5`, `scipy==1.10.1`, `opencv-python==4.8.1.78`, `matplotlib==3.7.5`, and `timm==0.1.20`. The environment contains the remaining dependencies declared by upstream as well. No Conda or CUDA installation is needed to run this CPU setup.

The original CPU setup passed `uv pip check` for 52 packages. With optional OpenVINO/ONNX installed, the check now passes for 55 packages. The command-line help, compiled bounding-box/mask operations, and upstream sample-image inference passed. Leo confirmed that the native webcam displayed skeletons for multiple people, but it was extremely slow. The accelerated webcam then processed about 12–13 frames/s in its initial live profile. Actual curl counting and camera-to-dashboard latency remain unverified.

## Intel GPU mode

This laptop's Intel Arc 140V is available to OpenVINO 2024.6.0 with the existing driver. The optional mode keeps the pinned FastPose and YOLOv3-SPP weights, COCO joints, postprocessing, lane assignment, and scoring code. It uses a 416-pixel detector input rather than the upstream default 608, so camera accuracy must be checked at the chosen resolution.

After preparing a terminal as described below, these are the setup commands for an already installed AlphaPose environment:

```powershell
uv pip install --python $alphaPython --cache-dir ..\.uv-cache 'openvino==2024.6.0' 'onnx==1.14.1' 'numpy==1.23.5'
& $alphaPython export_alphapose.py --repo ..\AlphaPose
```

Exports and a manifest go into ignored `data/openvino/`. The manifest binds the exports to SHA256 hashes of the source weights and config; the runtime also checks export hashes and shapes. Each person's pose is evaluated with a fixed batch-one model, and copied outputs prevent subsequent inference from overwriting a previous person's heatmaps.

For a standalone preview with no dashboard session:

```powershell
& $alphaPython alphapose_bridge.py preview --repo ..\AlphaPose --openvino-device GPU --cpu-threads 4 --profile
```

For the live bridge, after starting a one-person camera session in the dashboard:

```powershell
& $alphaPython alphapose_bridge.py camera --repo ..\AlphaPose --openvino-device GPU --cpu-threads 4 --show-camera --profile
```

Press Ctrl+C to stop a preview before starting the bridge. Both modes suppress live pose JSON saving. Omitting `--openvino-device` keeps the original PyTorch path and 608-pixel detector default. `--detector-size` and `--cpu-threads` are explicit tuning options; exports must match the selected detector size.

The runtime requests FP32 inference. An initial reduced-precision trial added one detection in a crowded sample and was rejected. With FP32, native and accelerated inference at 416 pixels matched detection counts **5, 5, 14** on all three upstream sample images. Matching boxes had IoU above 0.99999; maximum right-elbow-angle difference on usable arms was below 0.001 degrees, and arm-availability decisions agreed. This verifies conversion on these samples, not rep accuracy on volunteers.

The adapter briefly yields when upstream's webcam queue is full, preventing its busy loop from starving Python initialization/postprocessing. No upstream inference source file is edited for this mode. Export temporarily removes a `Tensor.data` detach in memory, because otherwise the historical YOLO forward traces into an invalid constant ONNX graph; the exporter checks that the graph has an input. Optional OpenVINO conversion telemetry is disabled in a task-local configuration.

The initial accelerated webcam profile reported roughly 60 ms waiting for detector/camera input and 17–25 ms pose processing, at about 12–13 processed frames/s. These timings exclude a measured camera-to-dashboard path and do not establish the 100 ms target. The slower original CPU mode remains available.

Leo confirmed the accelerated preview was a lot smoother. When connecting the live bridge, Windows' `localhost` connection fallback added roughly two seconds per frame. The bridge now uses `127.0.0.1`, matching the server's IPv4 bind address; the initial live bridge then ran at about 10 processed frames/s. Open [http://127.0.0.1:8000](http://127.0.0.1:8000) for the curl checkpoint. Live counts now reach the dashboard; agreement with manual counts/range labels and saved history from a real curl remain to be verified.

### Diagnose unavailable angles

Append `--diagnostics data/tracking-diagnostics.json` to the **camera** command to overwrite a local summary once per second. It includes the number of detections per lane, right shoulder/elbow/wrist confidence, usable angle, and a reason such as low wrist confidence or multiple detections. It excludes images, joint coordinates, and detection boxes. The default camera command does not write this summary.

During Leo's one-person test, unavailable angles coincided with wrist confidence 0.024 or 0.222, and one elbow confidence of 0.367, all below the 0.4 cutoff. Other frames had strong joint confidence and valid angles. Detection count stayed at one in the sampled diagnostics. Physical visibility does not guarantee a confident model prediction. The confidence and curl-angle cutoffs remain unchanged in `pose.py`.

## Prepare a PowerShell terminal

Start in the tracker directory and set these process-local paths. Repeat this block in each new terminal used for AlphaPose. These settings do not change Windows' global environment.

```powershell
cd 'C:\Users\leosi\Desktop\ECE198 CCARE\ECE-198'
$workRoot = Split-Path (Get-Location).Path -Parent
$alphaPython = Join-Path $workRoot '.venv-alphapose\Scripts\python.exe'
$env:PYTHONPATH = Join-Path $workRoot 'AlphaPose'
$env:TORCH_HOME = Join-Path $workRoot '.torch'
$env:MPLCONFIGDIR = Join-Path $workRoot '.matplotlib'
$env:PYTHONUTF8 = '1'
$env:OMP_NUM_THREADS = '4'
```

`PYTHONPATH` makes the upstream `detector` and `trackers` modules available. The cache paths keep inference independent of the system Python and its user cache. Four CPU threads were used for the sample test; this is not a performance guarantee.

## Standalone webcam: next checkpoint

After preparing the terminal, run:

```powershell
cd ..\AlphaPose
& $alphaPython scripts/demo_inference.py --cfg configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml --checkpoint pretrained_models/fast_res50_256x192.pth --webcam 0 --sp --gpus -1 --vis --vis_fast --posebatch 4 --qsize 4
```

Close other apps using the webcam. Keep one consenting volunteer's anatomical right shoulder, elbow, and wrist visible. Confirm that the native skeleton view appears. Press Ctrl+C to release the camera before starting the bridge. If the required device is a second camera, use `--webcam 1`.

Upstream's standalone demo writes `alphapose-results.json` to its output directory when stopped normally. The tracker bridge disables that live JSON output.

## Connect the dashboard

Run `python app.py` from `ECE-198` in the dashboard terminal, if it is not already running. Open `http://localhost:8000`, select **Live AlphaPose camera**, set **1** participant and a small rep target, and start the session.

In a second terminal, run the preparation block above, then:

```powershell
& $alphaPython alphapose_bridge.py camera --repo ..\AlphaPose --gpus -1 --show-camera
```

The bridge supplies `--sp`. Begin with the arm lowered, then perform a full curl and a shortened curl. Check counts and range cues on the dashboard, click **End & save session**, stop the bridge with Ctrl+C, and review History. Actual performance remains to be measured.

## Verified sample check

From `AlphaPose` with the same environment settings:

```powershell
& $alphaPython scripts/demo_inference.py --cfg configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml --checkpoint pretrained_models/fast_res50_256x192.pth --image examples/demo/1.jpg --sp --gpus -1 --outdir examples/res-laptop-smoke --save_img --vis_fast --detbatch 1 --posebatch 4 --qsize 4 --profile
```

Observed output: five detections with 17 COCO joints each; a rendered skeleton image in `examples/res-laptop-smoke/vis/1.jpg`. Detection took about 0.503 seconds and pose inference 0.606 seconds on this one sample. These values do not measure live end-to-end latency.

## Build and model notes

The helper builds use the existing GCC compiler at `C:\msys64\ucrt64\bin\gcc.exe`, `Cython==0.29.37`, and `setuptools==69.5.1`. The local `.alphapose-build/mingw.cfg` selects `mingw32` and defines `MS_WIN64`. The cython-bbox 0.1.5 source copy changes its invalid Windows compiler-argument dictionary to the GCC list `['-std=c99', '-DMS_WIN64', '-static-libgcc']`. Its scoring/runtime implementation was not changed. The build inputs and installed package snapshot remain in `.alphapose-build` for this laptop.

AlphaPose was registered with an editable install using `--no-deps --no-build-isolation` after installing dependencies. Its setup regenerated `alphapose/version.py`; other upstream tracked source files were not changed. The full torchvision checkpoint was loaded successfully during the sample test.

Models came from the [pinned AlphaPose model zoo](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/MODEL_ZOO.md), [installation guide](https://github.com/MVIG-SJTU/AlphaPose/blob/c60106d19afb443e964df6f06ed1842962f5f1f7/docs/INSTALL.md#models), and the official torchvision download host. SHA256 values below record the downloaded files; the pose/detector hashes were not independently published checksums.

| Local file relative to workspace root | Bytes | SHA256 |
| --- | ---: | --- |
| `AlphaPose/pretrained_models/fast_res50_256x192.pth` | 162603012 | `42808e905aa20133a89a6a2cba073265a2ce35fabe65edffd9f153ef5846b7b0` |
| `AlphaPose/detector/yolo/data/yolov3-spp.weights` | 252209544 | `87a1e8c85c763316f34e428f2295e1db9ed4abcec59dd9544f8052f50de327b4` |
| `.torch/hub/checkpoints/resnet50-0676ba61.pth` | 102530333 | `0676ba61b6795bbe1773cffd859882e5e297624d384b6993f7c9e683e722fb8a` |

Keep models, environments, sample output, participant recordings, and databases local. Convex is optional and has not been deployed as part of this setup.
