"""Send AlphaPose COCO joints to a running CCCARE session."""
import argparse
from collections import defaultdict
import json
import os
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
from time import monotonic, sleep
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pose import assign_lanes


def local_request(base, route, data=None):
    body = json.dumps(data).encode() if data is not None else None
    headers = {"Content-Type": "application/json"} if body else {}
    with urlopen(Request(base + route, data=body, headers=headers), timeout=2) as response:
        return json.load(response)


class PoseFeed:
    def __init__(self, base, source):
        session = local_request(base, "/api/session")["session"]
        if not session or session["source"] != source:
            raise ValueError(f"Start a {source} session in the dashboard first.")
        self.base = base
        self.session_id = session["id"]
        self.seats = len(session["participants"])
        self.frame = session["last_frame"] + 1
        self.closed = False

    def send(self, detections, width):
        if self.closed:
            return
        try:
            local_request(self.base, "/api/pose", {
                "session_id": self.session_id,
                "frame": self.frame,
                "poses": assign_lanes(detections, width, self.seats),
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

    # AlphaPose resolves model assets relative to its own checkout.
    os.chdir(repo)
    sys.path.insert(0, str(repo))
    from alphapose.utils import vis, writer

    original_vis = vis.vis_frame_fast
    detections = []

    def collect(image, result, options, thresholds):
        detections.extend(writer_detection(person) for person in result["result"])
        return original_vis(image, result, options, thresholds) if args.show_camera else image

    class LiveWriter(writer.DataWriter):
        def write_image(self, image, name, stream=None):
            try:
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
    with TemporaryDirectory(prefix="cccare-alphapose-") as output:
        sys.argv = [str(demo), "--cfg", str(args.cfg), "--checkpoint", str(args.checkpoint),
                    "--webcam", str(args.index), "--gpus", args.gpus, "--outdir", output,
                    "--posebatch", "8", "--sp", "--vis", "--vis_fast"]
        runpy.run_path(str(demo), run_name="__main__")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    commands = parser.add_subparsers(dest="mode", required=True)
    recording = commands.add_parser("recording", help="Replay an exported COCO JSON file")
    recording.add_argument("json_file", type=Path)
    recording.add_argument("--width", type=int, required=True, help="Original video frame width")
    recording.add_argument("--fps", type=float, default=15, help="Replay rate")
    camera = commands.add_parser("camera", help="Run the installed AlphaPose webcam demo")
    camera.add_argument("--repo", type=Path, required=True)
    camera.add_argument("--cfg", type=Path, default=Path("configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml"))
    camera.add_argument("--checkpoint", type=Path, default=Path("pretrained_models/fast_res50_256x192.pth"))
    camera.add_argument("--index", type=int, default=0)
    camera.add_argument("--gpus", default="0", help="Use -1 for CPU, 0 for the first CUDA GPU")
    camera.add_argument("--show-camera", action="store_true")
    args = parser.parse_args()
    if args.mode == "recording" and (args.width < 1 or not 0 < args.fps <= 120):
        parser.error("--width must be positive and --fps must be greater than 0 and at most 120")
    try:
        feed = PoseFeed(f"http://localhost:{args.port}", args.mode)
        if feed.frame:
            feed.send([], 1)  # A restarted feed cannot complete a previous partial attempt.
        if args.mode == "camera":
            run_camera(args, feed)
        else:
            replay_recording(args, feed)
    except (OSError, ValueError, ImportError) as error:
        parser.exit(1, f"Pose bridge: {error}\n")
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
