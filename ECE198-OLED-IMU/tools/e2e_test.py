#!/usr/bin/env python3
"""Hardware end-to-end test for the wearable.

Drives the real board over USB serial while publishing feedback to the real
Convex deployment (the same /feedback HTTP route the laptop relay uses), and
checks what the firmware puts on the OLED (it echoes every frame as [OLED]).

Scenarios: boot + connect, live rep updates, Convex connection drop, Wi-Fi
outage, laptop relay stalling, session end, and no crashes / memory leaks.

Usage (board flashed and plugged in, serial monitor closed):
    python3 ECE198-OLED-IMU/tools/e2e_test.py [--port /dev/ttyUSB0] [--log e2e.log]

Reads CONVEX_SITE_URL and FEEDBACK_PUBLISH_TOKEN from the repo's .env.local /
.env. Requires pyserial. Exits non-zero if any check fails.
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.request
from pathlib import Path

import serial

REPO = Path(__file__).resolve().parents[2]
PARTICIPANT = "P01"
TARGET = 8


def load_env():
    env = {}
    for name in (".env", ".env.local"):
        path = REPO / name
        if path.exists():
            for line in path.read_text().splitlines():
                m = re.match(r"^([A-Z_]+)=(.*)$", line)
                if m:
                    env[m.group(1)] = m.group(2).strip('"')
    env.update({k: v for k, v in os.environ.items() if k in ("CONVEX_SITE_URL", "FEEDBACK_PUBLISH_TOKEN")})
    return env


class Board:
    """Collects serial lines in a background thread; lets tests wait on regexes."""

    def __init__(self, port, log_path):
        self.ser = serial.Serial(port, 115200, timeout=0.1)
        self.lines = []  # (monotonic time, text)
        self.lock = threading.Lock()
        self.log = open(log_path, "w") if log_path else None
        self.running = True
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        buf = b""
        while self.running:
            buf += self.ser.read(4096)
            *complete, buf = buf.split(b"\n")
            for raw in complete:
                text = raw.decode(errors="replace").rstrip("\r")
                with self.lock:
                    self.lines.append((time.monotonic(), text))
                if self.log:
                    self.log.write(f"{time.strftime('%H:%M:%S')} {text}\n")
                    self.log.flush()

    def reset(self):
        self.ser.dtr = False
        self.ser.rts = True
        time.sleep(0.1)
        self.ser.rts = False

    def send(self, command):
        self.ser.write((command + "\n").encode())

    def mark(self):
        with self.lock:
            return len(self.lines)

    def wait_for(self, pattern, timeout, since=None):
        """Wait for a line matching `pattern` after index `since`. Returns (elapsed, line) or None."""
        regex = re.compile(pattern)
        start = time.monotonic()
        index = self.mark() if since is None else since
        while time.monotonic() - start < timeout:
            with self.lock:
                new = self.lines[index:]
                index = len(self.lines)
            for _, text in new:
                if regex.search(text):
                    return time.monotonic() - start, text
            time.sleep(0.05)
        return None

    def all_text(self):
        with self.lock:
            return [t for _, t in self.lines]

    def close(self):
        self.running = False
        time.sleep(0.2)
        self.ser.close()
        if self.log:
            self.log.close()


class Relay:
    """Fake laptop relay: publishes a session for P01 every second while running."""

    def __init__(self, site, token):
        self.url = site.rstrip("/") + "/feedback"
        self.token = token
        self.reps = 0
        self.heartbeat = False
        self.session_id = f"e2e-{int(time.time())}"
        self.errors = []
        threading.Thread(target=self._loop, daemon=True).start()

    def publish(self, session):
        req = urllib.request.Request(self.url, data=json.dumps({"session": session}).encode(), headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {self.token}"})
        with urllib.request.urlopen(req, timeout=5) as res:
            assert res.status == 204, res.status

    def session(self):
        return {"id": self.session_id, "source": "replay", "exercise": "squat", "station": "E2E bench",
                "participants": [{"id": PARTICIPANT, "reps": self.reps, "target": TARGET,
                                  "cue": "Range reached", "cue_code": "RANGE_OK",
                                  "display_text": "Range reached", "range_score": 100}]}

    def set_reps(self, reps):
        self.reps = reps
        self.heartbeat = True
        self.publish(self.session())

    def end_session(self):
        self.heartbeat = False
        self.publish(None)

    def _loop(self):
        while True:
            if self.heartbeat:
                try:
                    self.publish(self.session())
                except Exception as error:  # network blip: report, keep going
                    self.errors.append(str(error))
            time.sleep(1)


def oled(text):
    return r"^\[OLED\].*\| " + re.escape(text)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--log", default=None, help="write the full serial log here")
    args = parser.parse_args()

    env = load_env()
    if not env.get("CONVEX_SITE_URL") or not env.get("FEEDBACK_PUBLISH_TOKEN"):
        sys.exit("Need CONVEX_SITE_URL and FEEDBACK_PUBLISH_TOKEN in .env.local/.env")

    board = Board(args.port, args.log)
    relay = Relay(env["CONVEX_SITE_URL"], env["FEEDBACK_PUBLISH_TOKEN"])
    results = []

    def check(name, outcome, detail=""):
        ok = outcome is not None and outcome is not False
        took = f"{outcome[0]:5.1f}s" if isinstance(outcome, tuple) else "      "
        results.append(ok)
        print(f"{'PASS' if ok else 'FAIL'}  {took}  {name}{('  ' + detail) if detail else ''}", flush=True)
        return ok

    try:
        relay.end_session()  # start from a clean "no session" row
        board.send("imu off")
        board.reset()
        time.sleep(0.5)
        board.send("imu off")

        print("== Boot and connect")
        check("joins Wi-Fi", board.wait_for(r"^\[WiFi\] Got IP", 60, since=0))
        check("connects to Convex", board.wait_for(r"^\[Convex\] Connected", 30, since=0))
        check("shows waiting screen", board.wait_for(oled("Waiting session"), 15, since=0))

        print("== Live updates")
        for reps in (1, 2, 3):
            mark = board.mark()
            relay.set_reps(reps)
            check(f"OLED shows {reps}/{TARGET}", board.wait_for(oled(f"{reps}/{TARGET} "), 8, since=mark))

        print("== Convex connection dropped")
        mark = board.mark()
        board.send("drop convex")
        check("detects the drop", board.wait_for(r"^\[Convex\] Connection lost", 5, since=mark))
        check("clears the stale cue", board.wait_for(oled("Connection lost"), 5, since=mark))
        relay.set_reps(4)  # changes while the board is offline
        check("reconnects", board.wait_for(r"^\[Convex\] Connected .*connection #[1-9]", 20, since=mark))
        check("catches up to 4/8", board.wait_for(oled(f"4/{TARGET} "), 10, since=mark))

        print("== Wi-Fi outage (15 s)")
        mark = board.mark()
        board.send("drop wifi 15")
        check("Convex notices network loss", board.wait_for(r"^\[Convex\] Connection lost", 10, since=mark))
        check("OLED shows connection lost", board.wait_for(oled("Connection lost"), 10, since=mark))
        relay.set_reps(5)
        check("re-joins Wi-Fi", board.wait_for(r"^\[WiFi\] Got IP", 75, since=mark))
        check("Convex reconnects", board.wait_for(r"^\[Convex\] Connected", 30, since=mark))
        check("catches up to 5/8", board.wait_for(oled(f"5/{TARGET} "), 10, since=mark))

        print("== Laptop relay stalls")
        mark = board.mark()
        relay.heartbeat = False
        check("falls back to waiting (< 10 s)", board.wait_for(oled("Waiting session"), 10, since=mark))
        mark = board.mark()
        relay.set_reps(6)
        check("resumes when relay returns", board.wait_for(oled(f"6/{TARGET} "), 8, since=mark))

        print("== Session ends")
        mark = board.mark()
        relay.end_session()
        check("shows waiting after end", board.wait_for(oled("Waiting session"), 8, since=mark))

        print("== Health")
        mark = board.mark()
        board.send("status")
        status = board.wait_for(r"^\[Status\]", 5, since=mark)
        heap = int(re.search(r"heap=(\d+)", status[1]).group(1)) if status else 0
        check("status reports convex up", status and "convex=up" in status[1] and status, status[1] if status else "")
        check("free heap > 80 KB", heap > 80_000 or None, f"heap={heap}")
        crashes = [t for t in board.all_text()
                   if re.search(r"Guru Meditation|abort\(\)|Backtrace|Bad server message|rst:0x[^1] ", t)]
        check("no crashes or protocol errors", not crashes or None, "; ".join(crashes[:3]))
        check("relay published without errors", not relay.errors or None, "; ".join(relay.errors[:3]))
    finally:
        try:
            relay.end_session()
        except Exception:
            pass
        board.send("imu on")
        board.close()

    passed = sum(results)
    print(f"\n{passed}/{len(results)} checks passed")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
