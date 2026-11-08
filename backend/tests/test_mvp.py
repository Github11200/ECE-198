import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.tracker import database
from backend.tracker.server import RequestError, SessionService
from backend.tracker.pose import Curl, REPLAY_FRAMES, assign_lanes, elbow_angle, replay_frame
from backend.wearable.publish_feedback import wearable_snapshot
from backend.camera.bridge import PoseFeed


class PoseTests(unittest.TestCase):
    def test_lost_joint_discards_incomplete_rep_and_rearms(self):
        curl = Curl(target=2)
        for angle in (165, 100, 60, None, 160, 110, 95, 160):
            curl.observe(angle)
        self.assertEqual(curl.summary(), {
            "target": 2, "reps": 1, "full": 0, "short": 1, "last_range": "Short range",
        })

    def test_lanes_reject_a_collision_and_keep_the_other_seat(self):
        joint_list = replay_frame(0, 1)[0]
        people = [
            {"box": [10, 0, 50, 100], "keypoints": joint_list},
            {"box": [40, 0, 50, 100], "keypoints": joint_list},
            {"box": [125, 0, 50, 100], "keypoints": joint_list},
        ]
        self.assertEqual(assign_lanes(people, 200, 2), [None, joint_list])
        self.assertAlmostEqual(elbow_angle(joint_list), 165)


class SessionTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "sessions.sqlite3"
        self.service = SessionService(self.path)

    def test_five_independent_reps_finish_retry_and_restart(self):
        with patch("backend.tracker.server.monotonic", side_effect=[0, 0, REPLAY_FRAMES, REPLAY_FRAMES]):
            started = self.service.start({"source": "replay", "targets": [2, 4, 1, 3, 2]})
            live = self.service.current()
            result = self.service.finish({"session_id": started["id"]})

        self.assertEqual([person["reps"] for person in live["participants"]], [2, 3, 1, 1, 3])
        self.assertEqual([person["short"] for person in live["participants"]], [0, 2, 0, 0, 1])
        self.assertEqual(wearable_snapshot(live)["session"]["participants"][4]["cue"], "Above rep target")
        restarted = SessionService(self.path)
        self.assertIsNone(restarted.current())
        retry = restarted.finish({"session_id": result["id"]})
        self.assertEqual(retry, result)
        self.assertEqual(len(database.history(self.path)), 1)

    def test_camera_ignores_out_of_order_frames_and_prior_session(self):
        started = self.service.start({"source": "camera", "targets": [3]})
        session_id = started["id"]
        for frame, tick in enumerate((0, 5, 10)):
            payload = {"session_id": session_id, "frame": frame, "poses": replay_frame(tick, 1)}
            self.service.ingest(payload)
        self.assertEqual(self.service.ingest({**payload, "frame": 1}), {"accepted_frame": 2})
        self.assertEqual(self.service.current()["participants"][0]["reps"], 1)

        self.service.finish({"session_id": session_id})
        self.service.start({"source": "camera", "targets": [3]})
        with self.assertRaises(RequestError):
            self.service.ingest(payload)
        self.assertEqual(self.service.current()["participants"][0]["reps"], 0)


class DiagnosticTests(unittest.TestCase):
    def test_low_wrist_diagnostic_keeps_original_feed_and_omits_coordinates(self):
        import json
        points = replay_frame(0, 1)[0]
        points[32] = 0.2
        detection = {'box': [0, 0, 200, 200], 'keypoints': points}
        active = {'session': {'source': 'camera', 'id': 'demo',
                              'participants': [{'id': 'P01'}], 'last_frame': -1}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'tracking.json'
            with patch('backend.camera.bridge.local_request', side_effect=[active, {'accepted_frame': 0}]) as request:
                feed = PoseFeed('http://127.0.0.1:8000', 'camera', path)
                feed.send([detection], 200)
                self.assertEqual(request.call_args.args[2]['poses'], [points])
            snapshot = json.loads(path.read_text())
            self.assertEqual(snapshot['lanes'][0]['reason'], 'Low confidence in right wrist')
            self.assertIsNone(snapshot['lanes'][0]['candidates'][0]['angle'])
            self.assertNotIn('keypoints', path.read_text())
            self.assertNotIn('box', path.read_text())


if __name__ == "__main__":
    unittest.main()
