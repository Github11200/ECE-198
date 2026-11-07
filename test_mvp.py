import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import database
import alphapose_bridge
from app import RequestError, SessionService
from pose import Curl, REPLAY_FRAMES, assign_lanes, elbow_angle, replay_frame
from publish_feedback import wearable_snapshot


class PoseTests(unittest.TestCase):
    def test_camera_connects_directly_to_ipv4_server(self):
        with patch("sys.argv", ["alphapose_bridge.py", "--port", "8123", "camera", "--repo", "."]), \
                patch("alphapose_bridge.PoseFeed") as feed, \
                patch("alphapose_bridge.run_camera") as run:
            feed.return_value.frame = 0
            alphapose_bridge.main()
        feed.assert_called_once_with("http://127.0.0.1:8123", "camera", None)
        run.assert_called_once()

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
        with patch("app.monotonic", side_effect=[0, 0, REPLAY_FRAMES, REPLAY_FRAMES]):
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

    def test_camera_window_lifecycle_and_stale_restart(self):
        camera = Mock()
        camera.status.return_value = "open"
        self.service.camera = camera
        started = self.service.start({"source": "camera", "targets": [3]})
        camera.start.assert_called_once_with(started["id"])
        self.assertEqual(started["camera"], "starting")
        self.service.ingest({"session_id": started["id"], "frame": 0, "poses": [None]})
        self.assertEqual(self.service.current()["camera"], "open")

        self.service.open_camera({"session_id": started["id"]})
        self.assertEqual(camera.start.call_count, 2)
        self.assertEqual(self.service.current()["camera"], "starting")
        self.service.finish({"session_id": started["id"]})
        camera.stop.assert_called_once()
        self.service.finish({"session_id": started["id"]})
        camera.stop.assert_called_once()
        self.service.start({"source": "camera", "targets": [3]})
        with self.assertRaises(RequestError):
            self.service.open_camera({"session_id": started["id"]})
        self.assertEqual(camera.start.call_count, 3)

    def test_camera_launch_failure_can_retry_without_an_orphan_session(self):
        camera = Mock()
        camera.start.side_effect = OSError("Camera unavailable")
        self.service.camera = camera
        with self.assertRaises(RequestError) as error:
            self.service.start({"source": "camera", "targets": [3]})
        self.assertEqual(error.exception.status, 503)
        self.assertIsNone(self.service.current())
        self.service.start({"source": "replay", "targets": [3]})
        self.assertEqual(camera.start.call_count, 1)


if __name__ == "__main__":
    unittest.main()
