"""Serve the instructor dashboard and coordinate one session on the laptop."""
import argparse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Lock
from time import monotonic
from uuid import uuid4

import database
from pose import Curl, REPLAY_FPS, REPLAY_FRAMES, elbow_angle, replay_frame

ROOT = Path(__file__).resolve().parent
ASSETS = {"/": ("index.html", "text/html"), "/style.css": ("style.css", "text/css"),
          "/app.js": ("app.js", "text/javascript")}
SOURCES = ("replay", "camera", "recording")
CAMERA_STALE_SECONDS = 1.5


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


class Session:
    def __init__(self, source, targets):
        self.id = uuid4().hex
        self.source = source
        self.started_at = timestamp()
        self.started = monotonic()
        self.people = [Curl(target) for target in targets]
        self.last_frame = -1
        self.last_input = None

    def update(self, poses):
        for person, keypoints in zip(self.people, poses):
            person.observe(elbow_angle(keypoints))

    def advance(self):
        if self.source == "replay":
            current_frame = min(int((monotonic() - self.started) * REPLAY_FPS), REPLAY_FRAMES - 1)
            while self.last_frame < current_frame:
                self.last_frame += 1
                self.update(replay_frame(self.last_frame, len(self.people)))
        elif self.last_input is None or monotonic() - self.last_input > CAMERA_STALE_SECONDS:
            self.update([None] * len(self.people))

    def snapshot(self, finished=False):
        self.advance()
        people = [
            {"id": f"P{index:02}", "label": f"Participant {index:02}",
             **(person.summary() if finished else person.live())}
            for index, person in enumerate(self.people, 1)
        ]
        result = {"id": self.id, "source": self.source, "started_at": self.started_at,
                  "finished_at": timestamp() if finished else None, "participants": people}
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
        with self.lock:
            if self.active:
                raise RequestError(409, "Finish the active session first.")
            self.active = Session(source, targets)
            return self.active.snapshot()

    def ingest(self, data):
        with self.lock:
            session = self.active
            if not session or session.id != data.get("session_id") or session.source == "replay":
                raise RequestError(409, "This input does not match an active AlphaPose session.")
            frame, poses = data.get("frame"), data.get("poses")
            if type(frame) is not int or frame < 0 or not isinstance(poses, list) or len(poses) != len(session.people):
                raise RequestError(400, "Send a nonnegative frame number and one pose per seat.")
            if frame > session.last_frame:
                session.advance()
                session.update(poses)
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
                    if self.path in ASSETS:
                        filename, mime = ASSETS[self.path]
                        self.send(200, (ROOT / "web" / filename).read_bytes(), mime)
                        return
                    if self.path == "/api/session":
                        self.send_json(200, {"session": service.current()})
                        return
                    if self.path == "/api/history":
                        self.send_json(200, {"sessions": database.history(service.db_path)})
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
