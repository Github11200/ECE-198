"""Manage the local AlphaPose preview process owned by the dashboard."""
import os
from pathlib import Path
import subprocess
import sys


class CameraWindow:
    def __init__(self, root, port, index=0):
        self.root = Path(root)
        self.port = port
        self.index = index
        self.process = None

    def start(self, session_id):
        repo = self.root / "external" / "AlphaPose"
        for name in ("scripts/demo_inference.py", "pretrained_models/fast_res50_256x192.pth",
                     "detector/yolo/data/yolov3-spp.weights"):
            if not (repo / name).is_file():
                raise OSError("AlphaPose is not installed. Run setup-alphapose.ps1 first.")
        self.stop()
        local_python = self.root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        python = str(local_python) if local_python.is_file() else sys.executable
        cache = self.root / ".cache"
        cache.mkdir(exist_ok=True)
        env = {**os.environ, "TORCH_HOME": str(cache / "torch"),
               "MPLCONFIGDIR": str(cache / "matplotlib"), "PYTHONUTF8": "1",
               "OMP_NUM_THREADS": "4"}
        command = [python, "-u", str(self.root / "alphapose_bridge.py"),
                   "--port", str(self.port), "camera", "--repo", str(repo),
                   "--index", str(self.index), "--session-id", session_id, "--show-camera"]
        # Hide the helper console; OpenCV creates the visible camera window.
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        with (cache / "camera.log").open("w", encoding="utf-8") as log:
            self.process = subprocess.Popen(command, cwd=self.root, env=env,
                                            stdout=log, stderr=subprocess.STDOUT,
                                            creationflags=flags)

    def status(self):
        if self.process is None:
            return "closed"
        code = self.process.poll()
        return "open" if code is None else "closed" if code == 0 else "error"

    def stop(self):
        if self.process is None:
            return
        if self.process.poll() is None:
            if os.name == "nt":
                # The uv Python launcher can have a child interpreter. Close both.
                subprocess.run(["taskkill", "/PID", str(self.process.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               creationflags=subprocess.CREATE_NO_WINDOW, check=False)
            else:
                self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=2)
        self.process = None
