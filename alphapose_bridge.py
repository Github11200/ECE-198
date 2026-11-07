"""Send AlphaPose COCO joints to a running CCCARE session."""
import argparse
from collections import defaultdict
import json
from math import isfinite
import os
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
from time import monotonic, sleep, time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pose import MIN_CONFIDENCE, assign_lanes
from exercises import DEFAULT_EXERCISE, EXERCISES, JOINT_NAMES, measure


def local_request(base, route, data=None):
    body = json.dumps(data).encode() if data is not None else None
    headers = {"Content-Type": "application/json"} if body else {}
    with urlopen(Request(base + route, data=body, headers=headers), timeout=2) as response:
        return json.load(response)


def tracking_diagnostics(detections, width, seats, frame, exercise=DEFAULT_EXERCISE, participant_ids=None):
    """Describe lane/arm availability without retaining images or coordinates."""
    groups = [[] for _ in range(seats)]
    for person in detections:
        x, _, box_width, _ = person['box']
        center = x + box_width / 2
        if isfinite(center) and box_width > 0 and 0 <= center < width:
            groups[int(center * seats / width)].append(person)
    lanes = []
    required = sorted({joint for group in EXERCISES[exercise]['joints'] for joint in group})
    for index, people in enumerate(groups, 1):
        candidates = []
        for person in people:
            points = person['keypoints']
            confidence = {JOINT_NAMES[joint]: round(points[joint * 3 + 2], 3) for joint in required}
            angle, reason = measure(points, exercise)
            candidates.append({'joint_confidence': confidence, 'reason': reason,
                               'angle': round(angle, 1) if angle is not None else None})
        if not people:
            reason = 'No person detected in this lane'
        elif len(people) > 1:
            reason = 'Multiple detections in this lane'
        else:
            reason = candidates[0]['reason']
        lanes.append({'id': participant_ids[index - 1] if participant_ids else f'P{index:02}',
                      'lane': index, 'detections': len(people),
                      'reason': reason, 'candidates': candidates})
    return {'updated_at_ms': int(time() * 1000), 'frame': frame, 'exercise': exercise,
            'detections': len(detections), 'minimum_confidence': MIN_CONFIDENCE, 'lanes': lanes}


class PoseFeed:
    def __init__(self, base, source, diagnostics=None):
        session = local_request(base, "/api/session")["session"]
        if not session or session["source"] != source:
            raise ValueError(f"Start a {source} session in the dashboard first.")
        self.base = base
        self.session_id = session["id"]
        self.seats = len(session["participants"])
        self.exercise = session.get('exercise', DEFAULT_EXERCISE)
        self.participant_ids = [person['id'] for person in session['participants']]
        self.frame = session["last_frame"] + 1
        self.closed = False
        self.diagnostics = diagnostics.resolve() if diagnostics is not None else None
        self.last_diagnostic = float('-inf')
        if self.diagnostics is not None:
            self.diagnostics.parent.mkdir(parents=True, exist_ok=True)

    def send(self, detections, width):
        if self.closed:
            return
        snapshot = tracking_diagnostics(detections, width, self.seats, self.frame,
                                        self.exercise, self.participant_ids)
        if self.diagnostics is not None and monotonic() - self.last_diagnostic >= 1:
            self.last_diagnostic = monotonic()
            try:
                temporary = self.diagnostics.with_suffix('.tmp')
                temporary.write_text(json.dumps(snapshot, indent=2), encoding='utf-8')
                temporary.replace(self.diagnostics)
            except OSError as error:
                print(f'Could not write tracking diagnostics: {error}', file=sys.stderr, flush=True)
        try:
            local_request(self.base, "/api/pose", {
                "session_id": self.session_id,
                "frame": self.frame,
                "poses": assign_lanes(detections, width, self.seats),
                'lane_counts': [lane['detections'] for lane in snapshot['lanes']],
            })
        except HTTPError as error:
            if error.code != 409:
                raise
            print("The dashboard ended this session. Press Ctrl+C to close the camera.", flush=True)
            self.closed = True
        finally:
            self.frame += 1


def replay_recording(args, feed):
    entries = json.loads(args.json_file.read_text(encoding="utf-8"))
    if not isinstance(entries, list) or not entries:
        raise ValueError("Use a nonempty AlphaPose COCO JSON export.")
    frames = defaultdict(list)
    for entry in entries:
        if not isinstance(entry, dict) or not {"image_id", "box", "keypoints"} <= entry.keys():
            raise ValueError("Each detection needs image_id, box, and keypoints.")
        box, keypoints = entry["box"], entry["keypoints"]
        if not isinstance(box, list) or len(box) != 4 or not isinstance(keypoints, list) or len(keypoints) != 51:
            raise ValueError("Expected one xywh box and 17 COCO keypoints per detection.")
        if any(type(value) not in (int, float) or not -1_000_000 <= value <= 1_000_000 for value in box):
            raise ValueError("Box coordinates must be numeric.")
        frames[str(entry["image_id"])].append(entry)

    indices = {name: Path(name).stem for name in frames}
    numeric = all(index.isdecimal() for index in indices.values())
    order = sorted(frames, key=lambda name: int(indices[name])) if numeric else list(frames)
    first = int(indices[order[0]]) if numeric else 0
    started = monotonic()
    first_sent = feed.frame
    previous = -1
    for index, name in enumerate(order):
        if feed.closed:
            return
        frame = int(indices[name]) - first if numeric else index
        if frame > previous + 1:
            feed.send([], args.width)
        delay = frame / args.fps - (monotonic() - started)
        if delay > 0:
            sleep(delay)
        feed.send(frames[name], args.width)
        previous = frame
    print(f"Sent {feed.frame - first_sent} pose updates. End and save the session in the dashboard.")


def writer_detection(person):
    points = person["keypoints"].tolist()
    scores = person["kp_score"].reshape(-1).tolist()
    if len(points) != 17 or len(scores) != 17:
        raise ValueError("Choose an AlphaPose model with 17 COCO joints.")
    return {
        "box": [float(value) for value in person["box"]],
        "keypoints": [value for (x, y), score in zip(points, scores) for value in (x, y, score)],
    }


def run_camera(args, feed):
    repo = args.repo.resolve()
    demo = repo / "scripts" / "demo_inference.py"
    if not demo.is_file():
        raise ValueError(f"AlphaPose checkout not found at {repo}")
    for item in (args.cfg, args.checkpoint):
        if not (repo / item).is_file():
            raise ValueError(f"Required AlphaPose file missing: {item}")
    model_dir = args.openvino_models.resolve()

    # AlphaPose resolves model assets relative to its own checkout.
    os.chdir(repo)
    sys.path.insert(0, str(repo))
    from detector.yolo_cfg import cfg as detector_config
    detector_config.INP_DIM = args.detector_size
    if args.cpu_threads:
        import torch
        torch.set_num_threads(args.cpu_threads)
    restore_acceleration = None
    if args.openvino_device:
        from alphapose_acceleration import MODEL_FILES, prepare_openvino
        if (str(args.cfg).replace('\\', '/') != MODEL_FILES['pose_config']
                or str(args.checkpoint).replace('\\', '/') != MODEL_FILES['pose_weights']):
            raise ValueError('OpenVINO mode requires the default COCO FastPose config and checkpoint.')
        restore_acceleration = prepare_openvino(repo, model_dir, args.openvino_device, args.detector_size)
    from alphapose.utils import vis, writer

    original_vis = vis.vis_frame_fast
    detections = []

    def collect(image, result, options, thresholds):
        if feed is not None:
            detections.extend(writer_detection(person) for person in result["result"])
        return original_vis(image, result, options, thresholds) if args.show_camera else image

    class LiveWriter(writer.DataWriter):
        def write_image(self, image, name, stream=None):
            try:
                if feed is not None:
                    feed.send(detections, image.shape[1])
            except (URLError, TimeoutError) as error:
                print(f"Pose update failed: {error}", file=sys.stderr, flush=True)
            finally:
                detections.clear()
            if args.show_camera:
                super().write_image(image, name, stream=stream)

    # These hooks run inside AlphaPose's single writer thread with --sp.
    # It calls write_image even on frames with zero detected people.
    vis.vis_frame_fast = collect
    writer.DataWriter = LiveWriter
    writer.write_json = lambda *_args, **_kwargs: None  # Do not save live keypoints.
    try:
        with TemporaryDirectory(prefix="cccare-alphapose-") as output:
            sys.argv = [str(demo), "--cfg", str(args.cfg), "--checkpoint", str(args.checkpoint),
                        "--webcam", str(args.index), "--gpus", "-1" if args.openvino_device else args.gpus,
                        "--outdir", output, "--posebatch", "8", "--sp", "--vis", "--vis_fast"]
            if args.profile:
                sys.argv.append('--profile')
            runpy.run_path(str(demo), run_name="__main__")
    finally:
        if restore_acceleration:
            restore_acceleration()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    commands = parser.add_subparsers(dest="mode", required=True)
    recording = commands.add_parser("recording", help="Replay an exported COCO JSON file")
    recording.add_argument("json_file", type=Path)
    recording.add_argument("--width", type=int, required=True, help="Original video frame width")
    recording.add_argument("--fps", type=float, default=15, help="Replay rate")
    for mode in ('camera', 'preview'):
        camera = commands.add_parser(mode, help="Run the installed AlphaPose webcam" + (" without a dashboard session" if mode == 'preview' else " bridge"))
        camera.add_argument("--repo", type=Path, required=True)
        camera.add_argument("--cfg", type=Path, default=Path("configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml"))
        camera.add_argument("--checkpoint", type=Path, default=Path("pretrained_models/fast_res50_256x192.pth"))
        camera.add_argument("--index", type=int, default=0)
        camera.add_argument("--gpus", default="0", help="Use -1 for CPU, 0 for the first CUDA GPU")
        camera.add_argument("--show-camera", action="store_true", default=mode == 'preview')
        camera.add_argument("--detector-size", type=int,
                            help="Detector input: defaults to 416 with OpenVINO, 608 otherwise")
        camera.add_argument("--cpu-threads", type=int)
        camera.add_argument("--profile", action="store_true")
        if mode == 'camera':
            camera.add_argument('--diagnostics', type=Path,
                                help='Overwrite a local lane/confidence summary once per second; no images or joint coordinates')
        camera.add_argument("--openvino-device", choices=('CPU', 'GPU'))
        camera.add_argument("--openvino-models", type=Path, default=Path(__file__).resolve().parent / 'data' / 'openvino')
    args = parser.parse_args()
    if args.mode == "recording" and (args.width < 1 or not 0 < args.fps <= 120):
        parser.error("--width must be positive and --fps must be greater than 0 and at most 120")
    if args.mode != 'recording':
        if args.detector_size is None:
            args.detector_size = 416 if args.openvino_device else 608
        if not 128 <= args.detector_size <= 1280 or args.detector_size % 32:
            parser.error('--detector-size must be a multiple of 32 between 128 and 1280')
        if args.cpu_threads is not None and not 1 <= args.cpu_threads <= 64:
            parser.error('--cpu-threads must be between 1 and 64')
    try:
        # The server binds IPv4. On Windows, resolving localhost to IPv6 first
        # can add seconds of connection fallback to every camera frame.
        feed = None if args.mode == 'preview' else PoseFeed(
            f"http://127.0.0.1:{args.port}", args.mode, getattr(args, 'diagnostics', None))
        if feed is not None and feed.frame:
            feed.send([], 1)  # A restarted feed cannot complete a previous partial attempt.
        if args.mode in ('camera', 'preview'):
            run_camera(args, feed)
        else:
            replay_recording(args, feed)
    except (OSError, ValueError, ImportError, RuntimeError) as error:
        parser.exit(1, f"Pose bridge: {error}\n")
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
