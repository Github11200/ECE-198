"""Own the camera bridge started by the local session API, never other apps."""
import os
from pathlib import Path
import signal
import subprocess
from threading import Lock
from time import monotonic


class CameraError(Exception):
    pass


def stop_process(process):
    """Release this bridge and its children (Windows venvs use a redirector)."""
    if process.poll() is not None:
        return
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       creationflags=subprocess.CREATE_NO_WINDOW, timeout=3, check=False)
    else:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            process.kill()
        else:
            os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=1)


class CameraController:
    def __init__(self, root, port, python=None, repo=None, device=None, index=0,
                 spawn=None, terminate=None):
        self.root = Path(root).resolve()
        default_python = self.root.parent / '.venv-alphapose' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
        self.python = Path(python or os.environ.get('ALPHAPOSE_PYTHON') or default_python).resolve()
        self.repo = Path(repo or os.environ.get('ALPHAPOSE_REPO') or self.root.parent / 'AlphaPose').resolve()
        self.device = device or os.environ.get('OPENVINO_DEVICE') or 'auto'
        self.index = index
        self.port = port
        self.log_path = self.root / 'data' / 'camera.log'
        self.spawn = spawn or subprocess.Popen
        self.terminate = terminate or stop_process
        self.process = None
        self.session_id = None
        self.started = None
        self.error = ''
        self.lock = Lock()

    def command(self, session_id):
        if not self.python.is_file():
            raise CameraError('AlphaPose Python environment is missing. Check camera setup or select the Replay input.')
        for relative in ('scripts/demo_inference.py', 'configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml',
                         'pretrained_models/fast_res50_256x192.pth', 'detector/yolo/data/yolov3-spp.weights'):
            if not (self.repo / relative).is_file():
                raise CameraError(f'AlphaPose setup is incomplete ({relative}). Check setup or select the Replay input.')
        device = self.device
        if device == 'auto':
            device = 'GPU' if (self.root / 'data/openvino/manifest.json').is_file() else 'native'
        command = [str(self.python), '-u', '-m', 'backend.camera.bridge', '--port', str(self.port),
                   'camera', '--repo', str(self.repo), '--index', str(self.index), '--stream-preview',
                   '--session-id', session_id, '--cpu-threads', os.environ.get('ALPHAPOSE_CPU_THREADS', '4'),
                   '--diagnostics', str(self.root / 'data/tracking-diagnostics.json')]
        if os.environ.get('ALPHAPOSE_SHOW_WINDOW') == '1':
            command.append('--show-camera')
        if device in ('GPU', 'CPU'):
            command += ['--openvino-device', device]
        elif device != 'native':
            raise CameraError('Unsupported camera device. Use auto, GPU, CPU, or native.')
        return command

    def start(self, session_id, restart=False):
        with self.lock:
            if self.process is not None and self.process.poll() is None:
                if self.session_id == session_id and not restart:
                    return  # Retried Start must not open a second webcam.
                self._stop()
            command = self.command(session_id)
            env = os.environ.copy()
            env['PYTHONUTF8'] = '1'
            env.setdefault('TORCH_HOME', str(self.root.parent / '.torch'))
            env.setdefault('MPLCONFIGDIR', str(self.root.parent / '.matplotlib'))
            env.setdefault('OMP_NUM_THREADS', os.environ.get('ALPHAPOSE_CPU_THREADS', '4'))
            options = {'cwd': str(self.root), 'env': env, 'stdin': subprocess.DEVNULL,
                       'stderr': subprocess.STDOUT}
            if os.name == 'nt':
                options['creationflags'] = subprocess.CREATE_NO_WINDOW
            else:
                options['start_new_session'] = True
            try:
                self.log_path.parent.mkdir(parents=True, exist_ok=True)
                with self.log_path.open('w', encoding='utf-8') as log:
                    try:
                        self.process = self.spawn(command, stdout=log, **options)
                    except OSError as error:
                        print(f'Could not launch AlphaPose: {error}', file=log)
                        raise
            except OSError as error:
                if getattr(error, 'winerror', None) == 4551:
                    raise CameraError('Windows Application Control blocked AlphaPose Python. Use an approved Python environment or select the Replay input.') from error
                raise CameraError('Could not launch AlphaPose. Check the installed environment and data/camera.log, or select the Replay input.') from error
            self.session_id = session_id
            self.started = monotonic()
            self.error = ''

    def _stop(self):
        if self.process is not None:
            try:
                self.terminate(self.process)
            except (OSError, subprocess.TimeoutExpired) as error:
                self.error = 'Could not close the camera. Close its preview before starting another session.'
                raise CameraError(self.error) from error
        self.process = None
        self.session_id = None

    def stop(self, session_id=None):
        with self.lock:
            if session_id is None or session_id == self.session_id:
                self._stop()

    def status(self, session_id, last_input=None):
        with self.lock:
            if self.session_id != session_id or self.process is None:
                return {'state': 'stopped', 'message': self.error or 'Camera is stopped.'}
            code = self.process.poll()
            if code is not None:
                return {'state': 'failed', 'message': f'AlphaPose stopped (exit {code}). Retry camera; details are in data/camera.log.'}
            if last_input is not None and last_input >= self.started:
                if monotonic() - last_input < 1.5:
                    return {'state': 'running', 'message': 'Camera connected. Keep the required joints visible.'}
                return {'state': 'paused', 'message': 'Camera frames stopped arriving. Check the preview or retry camera.'}
            if monotonic() - self.started > 60:
                return {'state': 'paused', 'message': 'Camera is taking longer than expected. Check data/camera.log or retry camera.'}
            return {'state': 'starting', 'message': 'Starting AlphaPose and opening the camera. Wait for the preview before exercising.'}
