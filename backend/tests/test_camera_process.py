import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from backend.camera.process import CameraController
from backend.tracker import database
from backend.tracker.server import RequestError, SessionService


class FakeProcess:
    def __init__(self):
        self.returncode = None

    def poll(self):
        return self.returncode


class CameraSessionTests(unittest.TestCase):
    def setUp(self):
        workspace = TemporaryDirectory()
        self.addCleanup(workspace.cleanup)
        root = Path(workspace.name)
        self.path = root / 'sessions.sqlite3'
        self.python = root / 'python'
        self.python.touch()
        repo = root / 'AlphaPose'
        for relative in ('scripts/demo_inference.py', 'configs/coco/resnet/256x192_res50_lr1e-3_1x.yaml',
                         'pretrained_models/fast_res50_256x192.pth', 'detector/yolo/data/yolov3-spp.weights'):
            file = repo / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.touch()
        self.launches = []
        self.stops = []
        self.camera = CameraController(root, 8001, self.python, repo, device='native',
                                       spawn=self.spawn, terminate=self.terminate)
        self.service = SessionService(self.path, camera=self.camera)

    def spawn(self, command, **options):
        process = FakeProcess()
        self.launches.append((command, process))
        return process

    def terminate(self, process):
        self.stops.append(process)
        process.returncode = -1

    def start(self, source='camera'):
        return self.service.start({'source': source, 'targets': [10, 10, 10], 'exercise': 'squat'})

    def test_only_live_camera_sessions_launch_a_bridge(self):
        for source in ('replay', 'recording'):
            session = self.start(source)
            self.assertNotIn('camera', session)
            self.service.finish({'session_id': session['id']})
        self.assertEqual(self.launches, [])

    def test_start_retry_and_finish_own_the_same_camera_session(self):
        session = self.start()
        session_id = session['id']
        request = {'session_id': session_id}
        self.assertEqual(session['camera']['state'], 'starting')
        command, first = self.launches[0]
        self.assertEqual(command[command.index('--session-id') + 1], session_id)
        with self.assertRaises(RequestError) as duplicate:
            self.start()
        self.assertEqual(duplicate.exception.status, 409)
        self.assertEqual(len(self.launches), 1)
        self.service.ingest({**request, 'frame': 2, 'poses': [None, None, None]})
        running = self.service.current()
        self.assertEqual(running['camera']['state'], 'running')
        first.returncode = 1
        self.assertEqual(self.service.current()['camera']['state'], 'failed')
        retried = self.service.restart_camera(request)
        self.assertEqual(retried['camera']['state'], 'starting')
        self.assertEqual(retried['id'], session_id)
        self.assertEqual(retried['last_frame'], 2)
        self.assertEqual(retried['participants'], running['participants'])
        self.assertEqual(len(self.launches), 2)
        second = self.launches[1][1]
        with patch.object(database, 'save', side_effect=sqlite3.OperationalError('disk full')):
            with self.assertRaises(sqlite3.OperationalError):
                self.service.finish(request)
        self.assertIsNone(second.returncode)
        result = self.service.finish(request)
        self.assertIn(second, self.stops)
        self.assertIsNone(self.service.current())
        self.assertEqual(self.service.finish(request), result)
        self.assertEqual(database.history(self.path), [result])

    def test_missing_camera_does_not_open_a_session_or_enqueue_events(self):
        self.python.unlink()
        with self.assertRaises(RequestError) as unavailable:
            self.start()
        self.assertEqual(unavailable.exception.status, 503)
        self.assertIsNone(self.service.current())
        self.assertEqual(database.pending(self.path), [])
        self.assertEqual(self.launches, [])

    def test_failed_start_write_releases_launched_camera(self):
        with patch.object(database, 'enqueue', side_effect=sqlite3.OperationalError('disk full')):
            with self.assertRaises(sqlite3.OperationalError):
                self.start()
        self.assertEqual(self.stops, [self.launches[0][1]])
        self.assertIsNone(self.service.current())
