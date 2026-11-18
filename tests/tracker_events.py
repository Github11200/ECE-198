"""Emit real tracker/relay payloads as JSON for tests/contracts.test.ts (no network, temp SQLite only)."""
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

from backend.tracker import database
from backend.tracker.server import SessionService
from backend.wearable.publish_feedback import publisher_payload

with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / "camera.sqlite3"
    service = SessionService(path)
    started = service.start({"source": "camera", "targets": [8, 10], "participant_ids": ["P01", "P27"]})
    for frame in (1, 2):
        service.ingest({"session_id": started["id"], "frame": frame, "poses": [[0.9] * 51, None],
                        "lane_counts": [1, 0]})
    live = publisher_payload(service.current())
    final = service.finish({"session_id": started["id"]})
    SessionService(path)  # a tracker restart must not re-queue the finished session
    events = database.pending(path, limit=1000)
    # A report saved before the upload queue existed is imported once on startup.
    legacy = Path(directory) / "legacy.sqlite3"
    legacy.write_bytes(path.read_bytes())
    with sqlite3.connect(legacy) as db:
        db.execute("DELETE FROM convex_outbox")
    SessionService(legacy)
    imports = database.pending(legacy, limit=1000)
    replay = SessionService(Path(directory) / "replay.sqlite3")
    replay.start({"source": "replay", "targets": [5], "participant_ids": ["P05"]})
    replay_live = publisher_payload(replay.current())
    replay_events = database.pending(replay.db_path, limit=1000)
json.dump({"events": events, "imports": imports, "final": final, "live": live, "replayLive": replay_live,
           "replayEvents": replay_events, "idle": publisher_payload(None)}, sys.stdout)
