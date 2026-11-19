import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from backend.tracker import database
from backend.tracker.server import RequestError, SessionService
from backend.tracker.exercises import EXERCISES, counter, measure, report
from backend.tracker.pose import REPLAY_FRAMES, replay_frame


class ExerciseTests(unittest.TestCase):
    def test_every_exercise_replay_report_and_restart_keep_roster_order(self):
        with tempfile.TemporaryDirectory() as directory:
            for exercise in EXERCISES:
                with self.subTest(exercise=exercise):
                    path = Path(directory) / (exercise + '.sqlite3')
                    service = SessionService(path)
                    ids = ['P30', 'P07', 'P18', 'P02', 'P11']
                    with patch('backend.tracker.server.monotonic', side_effect=[0, 0, REPLAY_FRAMES, REPLAY_FRAMES]):
                        started = service.start(dict(source='replay', exercise=exercise, station='Station B',
                                                     targets=[2, 4, 1, 3, 2], participant_ids=ids))
                        live = service.current()
                        finished = service.finish({'session_id': started['id']})
                    self.assertEqual([p['reps'] for p in live['participants']], [2, 3, 1, 1, 3])
                    self.assertEqual([p['full'] for p in live['participants']], [2, 1, 1, 1, 2])
                    self.assertEqual([p['range_score'] for p in live['participants']], [100, 33, 100, 100, 67])
                    self.assertEqual(live['participants'][3]['tracking_losses'], 1)
                    self.assertEqual(live['participants'][3]['discarded_attempts'], 0)
                    self.assertEqual([p['id'] for p in finished['participants']], ids)
                    restarted = SessionService(path)
                    self.assertIsNone(restarted.current())
                    self.assertEqual(restarted.finish({'session_id': started['id']}), finished)
                    self.assertEqual(database.history(path)[0]['station'], 'Station B')
                    self.assertEqual(database.history(path)[0]['exercise'], exercise)
                    for person in finished['participants']:
                        self.assertEqual(len(person['rep_details']), person['reps'])

    def test_sit_to_stand_does_not_count_a_seated_knee_extension(self):
        person = counter('sit_to_stand', 2)
        for frame in (0, 5, 10):
            points = replay_frame(frame, 1, EXERCISES['knee_extension'])[0]
            hx, hy = points[36:38]
            kx, ky = points[42:44]
            dx, dy = kx - hx, ky - hy
            points[18:21] = [hx - dy, hy + dx, 0.95]  # Hip stays at 90 degrees.
            angle, _ = measure(points, 'sit_to_stand')
            person.observe(angle)
        self.assertEqual(person.reps, 0)

    @staticmethod
    def _mirrored(points):
        """Move a right-side replay pose onto the matching left COCO joints."""
        left = [0.0] * 51
        for joint in range(6, 17, 2):
            left[(joint - 1) * 3:joint * 3] = points[joint * 3:joint * 3 + 3]
        return left

    def test_every_exercise_counts_the_left_side(self):
        for exercise in EXERCISES:
            with self.subTest(exercise=exercise):
                right, left = counter(exercise, 2), counter(exercise, 2)
                for frame in range(REPLAY_FRAMES):
                    points = replay_frame(frame, 1, EXERCISES[exercise])[0]
                    right.observe(measure(points, exercise)[0])
                    left.observe(measure(self._mirrored(points), exercise)[0])
                self.assertGreater(right.reps, 0)
                self.assertEqual((left.reps, left.full), (right.reps, right.full))

    def test_curl_follows_the_working_arm_when_both_are_visible(self):
        resting = replay_frame(0, 1, EXERCISES['right_arm_curl'])[0]
        person = counter('right_arm_curl', 2)
        for frame in range(REPLAY_FRAMES):
            working = replay_frame(frame, 1, EXERCISES['right_arm_curl'])[0]
            points = list(resting)
            for joint in range(6, 17, 2):  # Left arm curls while the right arm stays lowered.
                points[(joint - 1) * 3:joint * 3] = working[joint * 3:joint * 3 + 3]
            person.observe(measure(points, 'right_arm_curl')[0])
        self.assertEqual(person.reps, 2)

    def test_low_confidence_reports_the_closer_side(self):
        points = replay_frame(0, 1, EXERCISES['right_arm_curl'])[0]
        points[32] = 0.2
        self.assertEqual(measure(points, 'right_arm_curl'), (None, 'Low confidence in right wrist'))
        self.assertEqual(measure(self._mirrored(points), 'right_arm_curl'),
                         (None, 'Low confidence in left wrist'))

    def test_report_uses_unrounded_angle_at_range_boundary(self):
        person = counter('right_arm_curl', 1)
        for angle in (165, 115, 70.04, 160):
            person.observe(angle)
        result = report(person, dict(samples=4, valid_samples=4, tracking_losses=0), 'right_arm_curl')
        self.assertEqual(person.full, 0)
        self.assertFalse(result['rep_details'][0]['reached_range'])
        self.assertAlmostEqual(result['rep_details'][0]['peak_angle'], 70.04)

    def test_tracking_loss_is_separate_from_completed_rep_range(self):
        with tempfile.TemporaryDirectory() as directory:
            service = SessionService(Path(directory) / 'test.sqlite3')
            started = service.start(dict(source='camera', targets=[3], participant_ids=['P30']))
            for frame, tick in enumerate((0, 5)):
                service.ingest(dict(session_id=started['id'], frame=frame,
                                    poses=replay_frame(tick, 1), lane_counts=[1]))
            service.ingest(dict(session_id=started['id'], frame=2, poses=[None], lane_counts=[2]))
            person = service.current()['participants'][0]
            self.assertEqual(person['reps'], 0)
            self.assertEqual(person['discarded_attempts'], 1)
            self.assertEqual(person['tracking_losses'], 1)
            self.assertEqual(person['tracking_reason'], 'Multiple people in this lane')
            self.assertEqual(person['tracking_coverage'], 67)

    def test_invalid_rosters_and_exercises_do_not_start_session(self):
        with tempfile.TemporaryDirectory() as directory:
            service = SessionService(Path(directory) / 'test.sqlite3')
            for invalid in ({'participant_ids': ['P01', 'P01']}, {'participant_ids': ['P00', 'P02']},
                            {'exercise': 'unknown'}, {'station': ''}):
                with self.subTest(invalid=invalid), self.assertRaises(RequestError):
                    service.start(dict(source='camera', targets=[2, 2], **invalid))
                self.assertIsNone(service.current())

    def test_existing_database_migrates_without_losing_results(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'legacy.sqlite3'
            with closing(sqlite3.connect(path)) as db:
                db.executescript('''
                    CREATE TABLE participants (id TEXT PRIMARY KEY, label TEXT NOT NULL);
                    CREATE TABLE sessions (id TEXT PRIMARY KEY, source TEXT, started_at TEXT, finished_at TEXT);
                    CREATE TABLE results (session_id TEXT, participant_id TEXT, target INTEGER, reps INTEGER,
                                          full INTEGER, last_range TEXT, PRIMARY KEY(session_id, participant_id));
                    INSERT INTO participants VALUES ('P01', 'Participant 01');
                    INSERT INTO sessions VALUES ('old', 'camera', 'start', 'finish');
                    INSERT INTO results VALUES ('old', 'P01', 3, 4, 2, 'Short range');
                ''')
            database.initialize(path)
            row = database.history(path)[0]
            self.assertEqual(row['exercise'], 'right_arm_curl')
            self.assertEqual(row['participants'][0]['reps'], 4)
            self.assertEqual(row['participants'][0]['range_score'], 50)
            self.assertIsNone(row['participants'][0]['tracking_coverage'])
            self.assertEqual(row['participants'][0]['rep_details'], [])
