"""Serve the instructor dashboard and coordinate one session on the laptop."""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import re
from pathlib import Path
from threading import Lock
from time import monotonic
from uuid import uuid4
from urllib.parse import unquote, urlsplit

from . import database
from .pose import MIN_CONFIDENCE, REPLAY_FPS, REPLAY_FRAMES, replay_frame
from .exercises import DEFAULT_EXERCISE, EXERCISES, catalog, counter, criteria, measure, report
from .reports import workout_report

ROOT = Path(__file__).resolve().parents[2]  # repository root
ASSETS = {"/": ("index.html", "text/html"), "/style.css": ("style.css", "text/css"),
          "/app.js": ("app.js", "text/javascript"),
          "/tracker": ("index.html", "text/html"), "/tracker/": ("index.html", "text/html")}
SOURCES = ("replay", "camera", "recording")
CAMERA_STALE_SECONDS = 1.5


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def frontend_asset(target):
    """Resolve only exported public files, including Next client-navigation data."""
    root = (ROOT / 'frontend' / 'out').resolve()
    if not (root / 'index.html').is_file():
        return None
    path = unquote(urlsplit(target).path)
    if '\\' in path or '\x00' in path or any(part in ('.', '..') for part in path.split('/')):
        return None
    asset = (root / path.lstrip('/')).resolve()
    if not asset.is_relative_to(root):
        return None
    if asset.is_dir():
        asset = (asset / 'index.html').resolve()
    if asset.is_relative_to(root) and asset.is_file():
        return asset, mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
    return None


class Session:
    def __init__(self, source, targets, exercise=DEFAULT_EXERCISE, station='Station 1', participant_ids=None):
        self.id = uuid4().hex
        self.source = source
        self.started_at = timestamp()
        self.started = monotonic()
        self.exercise = exercise
        self.station = station
        self.participant_ids = participant_ids or [f'P{index:02}' for index in range(1, len(targets) + 1)]
        self.people = [counter(exercise, target) for target in targets]
        self.metrics = [dict(samples=0, valid_samples=0, tracking_losses=0,
                             reason='Waiting for input') for _ in targets]
        self.last_frame = -1
        self.last_input = None

    def update(self, poses, lane_counts=None, sample=True, stale=False):
        for index, (person, keypoints, metrics) in enumerate(zip(self.people, poses, self.metrics)):
            angle, reason = measure(keypoints, self.exercise)
            if stale:
                reason = 'Camera feed paused'
            elif keypoints is None and lane_counts is not None:
                reason = 'Multiple people in this lane' if lane_counts[index] > 1 else 'No person detected in this lane'
            if angle is None and person.angle is not None:
                metrics['tracking_losses'] += 1
            if sample:
                metrics['samples'] += 1
                metrics['valid_samples'] += angle is not None
            metrics['reason'] = reason
            person.observe(angle)

    def advance(self):
        if self.source == "replay":
            current_frame = min(int((monotonic() - self.started) * REPLAY_FPS), REPLAY_FRAMES - 1)
            while self.last_frame < current_frame:
                self.last_frame += 1
                self.update(replay_frame(self.last_frame, len(self.people), EXERCISES[self.exercise]))
        elif self.last_input is None or monotonic() - self.last_input > CAMERA_STALE_SECONDS:
            self.update([None] * len(self.people), sample=False, stale=True)

    def snapshot(self, finished=False):
        self.advance()
        people = [
            {"id": participant_id, "label": f"Participant {participant_id[1:]}", "lane": index,
             **(person.summary() if finished else person.live()),
             **report(person, metrics, self.exercise),
             **({} if finished else {'tracking_reason': metrics['reason']})}
            for index, (participant_id, person, metrics) in enumerate(zip(self.participant_ids, self.people, self.metrics), 1)
        ]
        result = {"id": self.id, "source": self.source, "started_at": self.started_at,
                  "finished_at": timestamp() if finished else None, "participants": people,
                  'exercise': self.exercise, 'exercise_label': EXERCISES[self.exercise]['label'],
                  'station': self.station, 'criteria': dict(
                      **{key: EXERCISES[self.exercise][key] for key in ('rest_angle', 'start_angle', 'full_angle', 'increasing', 'angle_label')},
                      description=criteria(EXERCISES[self.exercise]), minimum_confidence=MIN_CONFIDENCE)}
        if not finished:
            result["last_frame"] = self.last_frame
            result["replay_done"] = self.source == "replay" and self.last_frame == REPLAY_FRAMES - 1
        return result


class SessionService:
    def __init__(self, db_path):
        self.db_path = db_path
        database.initialize(db_path)
        self.active = None
        self.lock = Lock()

    def current(self):
        with self.lock:
            return self.active.snapshot() if self.active else None

    def start(self, data):
        source, targets = data.get("source"), data.get("targets")
        if source not in SOURCES:
            raise RequestError(400, "Choose a supported source.")
        if not isinstance(targets, list) or not 1 <= len(targets) <= 5 or any(
            type(target) is not int or not 1 <= target <= 99 for target in targets
        ):
            raise RequestError(400, "Set 1–5 whole-number rep targets between 1 and 99.")
        exercise = data.get('exercise', DEFAULT_EXERCISE)
        if not isinstance(exercise, str) or exercise not in EXERCISES:
            raise RequestError(400, 'Choose an exercise from /api/exercises.')
        station = data.get('station', 'Station 1')
        if not isinstance(station, str) or not 1 <= len(station.strip()) <= 60:
            raise RequestError(400, 'Set a station name between 1 and 60 characters.')
        ids = data.get('participant_ids', [f'P{index:02}' for index in range(1, len(targets) + 1)])
        if (not isinstance(ids, list) or len(ids) != len(targets)
                or any(not isinstance(value, str) or not re.fullmatch(r'P(?:0[1-9]|[1-9][0-9])', value) for value in ids)
                or len(set(ids)) != len(ids)):
            raise RequestError(400, 'Assign one unique participant ID (P01–P99) to each lane.')
        with self.lock:
            if self.active:
                raise RequestError(409, "Finish the active session first.")
            self.active = Session(source, targets, exercise, station.strip(), ids)
            return self.active.snapshot()

    def ingest(self, data):
        with self.lock:
            session = self.active
            if not session or session.id != data.get("session_id") or session.source == "replay":
                raise RequestError(409, "This input does not match an active AlphaPose session.")
            frame, poses = data.get("frame"), data.get("poses")
            if type(frame) is not int or frame < 0 or not isinstance(poses, list) or len(poses) != len(session.people):
                raise RequestError(400, "Send a nonnegative frame number and one pose per seat.")
            lane_counts = data.get('lane_counts')
            if lane_counts is not None and (not isinstance(lane_counts, list) or len(lane_counts) != len(poses)
                    or any(type(count) is not int or not 0 <= count <= 50 for count in lane_counts)):
                raise RequestError(400, 'lane_counts must contain one nonnegative detection count per lane (up to 50).')
            if lane_counts is not None and any(pose is not None and count != 1 for pose, count in zip(poses, lane_counts)):
                raise RequestError(400, 'A usable pose requires exactly one detection in its lane.')
            if frame > session.last_frame:
                session.advance()
                session.update(poses, lane_counts)
                session.last_frame = frame
                session.last_input = monotonic()
            return {"accepted_frame": session.last_frame}

    def finish(self, data):
        session_id = data.get("session_id")
        if not isinstance(session_id, str):
            raise RequestError(400, "A session ID is required.")
        with self.lock:
            if self.active and self.active.id == session_id:
                result = self.active.snapshot(finished=True)
                database.save(self.db_path, result)
                self.active = None
                return result
            saved = database.find(self.db_path, session_id)
            if saved:
                return saved
            raise RequestError(404, "Session not found.")


def handler_for(service, port):
    hosts = {f"localhost:{port}", f"127.0.0.1:{port}"}

    class Handler(BaseHTTPRequestHandler):
        def send(self, status, content, mime):
            self.send_response(status)
            self.send_header("Content-Type", mime + "; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(content)

        def send_json(self, status, result):
            self.send(status, json.dumps(result).encode(), "application/json")

        def dispatch(self):
            try:
                if self.headers.get("Host") not in hosts:
                    raise RequestError(403, "Open the demo using localhost.")
                if self.command == "GET":
                    match = re.fullmatch(r'/reports/([0-9a-f]{32})', self.path)
                    if match:
                        saved = database.find(service.db_path, match.group(1))
                        if saved is None:
                            raise RequestError(404, 'Saved workout not found.')
                        self.send(200, workout_report(saved).encode('utf-8'), 'text/html')
                        return
                    if self.path == '/api/exercises':
                        self.send_json(200, {'exercises': catalog(), 'max_active_lanes': 5,
                                             'identity_mode': 'manual participant-to-lane assignment'})
                        return
                    if self.path in ASSETS:
                        exported = frontend_asset(self.path) if self.path == '/' else None
                        if exported:
                            asset, mime = exported
                            self.send(200, asset.read_bytes(), mime)
                            return
                        filename, mime = ASSETS[self.path]
                        self.send(200, (ROOT / "legacy-dashboard" / filename).read_bytes(), mime)
                        return
                    if self.path == "/api/session":
                        self.send_json(200, {"session": service.current()})
                        return
                    if self.path == "/api/history":
                        self.send_json(200, {"sessions": database.history(service.db_path)})
                        return
                    exported = frontend_asset(self.path)
                    if exported:
                        asset, mime = exported
                        self.send(200, asset.read_bytes(), mime)
                        return
                else:
                    routes = {"/api/session/start": (201, service.start),
                              "/api/session/finish": (200, service.finish),
                              "/api/pose": (200, service.ingest)}
                    if self.path in routes:
                        origin = self.headers.get("Origin")
                        if origin and origin != f"http://{self.headers.get('Host')}":
                            raise RequestError(403, "Use the dashboard on this laptop.")
                        if self.headers.get_content_type() != "application/json":
                            raise RequestError(415, "Send application/json.")
                        try:
                            size = int(self.headers.get("Content-Length", "0"))
                            if not 0 < size <= 16_384:
                                raise RequestError(400, "Invalid JSON body length.")
                            data = json.loads(self.rfile.read(size))
                        except (ValueError, UnicodeError) as error:
                            raise RequestError(400, "Invalid JSON body.") from error
                        if not isinstance(data, dict):
                            raise RequestError(400, "Send a JSON object.")
                        status, action = routes[self.path]
                        self.send_json(status, action(data))
                        return
                raise RequestError(404, "Page or endpoint not found.")
            except RequestError as error:
                self.send_json(error.status, {"error": str(error)})

        do_GET = dispatch
        do_POST = dispatch

        def log_message(self, format, *args):
            if self.path not in ("/api/session", "/api/pose"):
                super().log_message(format, *args)

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--db", type=Path, default=ROOT / "data" / "sessions.sqlite3")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    service = SessionService(args.db)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler_for(service, args.port)) as server:
        print(f"CCCARE Exercise Tracker · http://localhost:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
