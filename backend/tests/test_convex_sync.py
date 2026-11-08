"""Durable capture, recovery, migration and publish acknowledgement contracts."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from backend.tracker import database
from backend.tracker.server import RequestError, SessionService
from backend.tracker.pose import replay_frame
from backend.wearable.publish_feedback import post_feedback, sync_pending


class ArchiveCaptureTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / 'sessions.sqlite3'
        self.service = SessionService(self.path)

    def start(self):
        return self.service.start({'source': 'camera', 'targets': [8, 10], 'participant_ids': ['P01', 'P27']})

    def test_short_session_has_start_and_finish_even_without_a_publisher_poll(self):
        session = self.start()
        result = self.service.finish({'session_id': session['id']})
        events = database.pending(self.path)
        self.assertEqual([event['kind'] for event in events], ['start', 'finish'])
        self.assertEqual(events[0]['snapshot']['participants'][1]['id'], 'P27')
        self.assertEqual(events[1]['snapshot'], result)
        self.assertIsNotNone(events[1]['snapshot']['finished_at'])
        self.assertEqual(self.service.finish({'session_id': session['id']}), result)
        self.assertEqual(len(database.pending(self.path)), 2)

    def test_accepted_pose_preserves_coordinates_diagnostics_and_out_of_order_does_not_duplicate(self):
        session = self.start()
        poses = [replay_frame(0, 1)[0], None]
        data = {'session_id': session['id'], 'frame': 5, 'poses': poses, 'lane_counts': [1, 0]}
        self.service.ingest(data)
        self.service.ingest({**data, 'frame': 4})
        self.service.ingest(data)
        event = database.pending(self.path)[1]
        self.assertEqual(event['pose'], {key: data[key] for key in ('frame', 'poses', 'lane_counts')})
        self.assertIn('tracking_coverage', event['snapshot']['participants'][0])
        self.assertIn('rep_details', event['snapshot']['participants'][0])
        self.assertEqual(len(database.pending(self.path)), 2)

    def test_pose_write_failure_leaves_memory_unchanged_and_retry_captures_frame(self):
        session = self.start()
        data = {'session_id': session['id'], 'frame': 5, 'poses': [None, None]}
        with patch.object(database, 'enqueue', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.service.ingest(data)
        self.assertEqual(self.service.active.last_frame, -1)
        self.service.ingest(data)
        self.assertEqual(database.pending(self.path)[1]['pose']['frame'], 5)

    def test_start_write_failure_does_not_start_an_unrecorded_session(self):
        with patch.object(database, 'enqueue', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.start()
        self.assertIsNone(self.service.active)

    def test_rejects_invalid_poses_before_advancing_session(self):
        session = self.start()
        for pose in ([1], [float('nan')] * 51, [True] * 51, 'bad', [float('inf')] * 51):
            with self.subTest(pose=str(pose)[:20]), self.assertRaises(RequestError):
                self.service.ingest({'session_id': session['id'], 'frame': 1, 'poses': [pose, None]})
        self.assertEqual(self.service.active.last_frame, -1)
        self.assertEqual(len(database.pending(self.path)), 1)

    def test_finish_database_failure_rolls_back_summary_and_outbox_together(self):
        session = self.start()
        # The same final summary cannot be inserted twice; failed transaction rolls back its event too.
        result = self.service.active.snapshot(finished=True)
        database.save(self.path, result)
        count = database.sync_status(self.path)['pending']
        with self.assertRaises(Exception):
            database.save(self.path, result)
        self.assertEqual(database.sync_status(self.path)['pending'], count)
        self.assertEqual(len(database.history(self.path)), 1)

    def test_queue_survives_restart_ack_is_idempotent_and_import_is_once_per_report(self):
        session = self.start()
        self.service.finish({'session_id': session['id']})
        before = database.pending(self.path)
        database.acknowledge(self.path, before[0]['eventId'])
        database.acknowledge(self.path, before[0]['eventId'])
        SessionService(self.path)
        pending = database.pending(self.path)
        self.assertEqual(pending[0], before[1])
        self.assertEqual(sum(e['kind'] == 'import' for e in pending), 1)
        SessionService(self.path)
        self.assertEqual(database.pending(self.path), pending)

    def test_migration_imports_all_old_reports_not_only_the_latest_thirty(self):
        for i in range(35):
            session = self.start()
            self.service.finish({'session_id': session['id']})
        database.initialize(self.path)
        events = database.pending(self.path, limit=1000)
        imported = [e for e in events if e['kind'] == 'import']
        self.assertEqual(len(imported), 35)
        self.assertEqual(len({e['snapshot']['id'] for e in imported}), 35)
        self.assertEqual(len(database.history(self.path)), 30)  # Legacy reader remains compatible.
        database.initialize(self.path)
        self.assertEqual(len(database.pending(self.path, limit=1000)), len(events))

    def test_pending_batches_stay_ordered_without_deleting_undelivered_events(self):
        self.start()
        for i in range(30):
            self.service.ingest({'session_id': self.service.active.id, 'frame': i, 'poses': [None, None]})
        batch = database.pending(self.path)
        self.assertEqual(len(batch), 25)
        self.assertEqual([e['sequence'] for e in batch], sorted(e['sequence'] for e in batch))
        for event in batch:
            database.acknowledge(self.path, event['eventId'])
        self.assertEqual(len(database.pending(self.path)), 6)


class PublisherDeliveryTests(unittest.TestCase):
    def test_posts_authenticated_json_and_propagates_http_errors(self):
        with patch('backend.wearable.publish_feedback.urlopen') as request:
            post_feedback('https://test.convex.site/archive', 'secret', {'event': {'eventId': 'x'}})
            sent = request.call_args.args[0]
            self.assertEqual(sent.get_header('Authorization'), 'Bearer secret')
            self.assertEqual(json.loads(sent.data), {'event': {'eventId': 'x'}})
            self.assertEqual(request.call_args.kwargs['timeout'], 2)
            error = HTTPError(sent.full_url, 401, 'Unauthorized', {}, None)
            self.addCleanup(error.close)
            request.side_effect = error
            with self.assertRaises(HTTPError):
                post_feedback(sent.full_url, 'bad', {})

    def test_acknowledges_only_committed_events_and_retries_same_id_after_lost_ack(self):
        events = [{'eventId': 'first', 'sequence': 1}, {'eventId': 'second', 'sequence': 2}]
        with patch('backend.wearable.publish_feedback.local_request') as local, patch('backend.wearable.publish_feedback.post_feedback') as remote:
            local.side_effect = [{'events': events}, {'ok': True}]
            remote.side_effect = [None, OSError('offline')]
            with self.assertRaises(OSError):
                sync_pending('http://local', 'https://test.convex.site', 'secret')
            self.assertEqual(local.call_count, 2)
            self.assertEqual(local.call_args.args[2], {'eventId': 'first'})
            # Server committed but local ack was lost: same event is sent again, never a new event ID.
            local.reset_mock(); remote.reset_mock(); remote.side_effect = None
            local.side_effect = [{'events': [events[1]]}, OSError('ack lost')]
            with self.assertRaises(OSError):
                sync_pending('http://local', 'https://test.convex.site', 'secret')
            local.side_effect = [{'events': [events[1]]}, {'ok': True}]
            self.assertEqual(sync_pending('http://local', 'https://test.convex.site', 'secret'), 1)
            self.assertEqual(remote.call_args_list[0], remote.call_args_list[1])

    def test_empty_queue_does_not_post(self):
        with patch('backend.wearable.publish_feedback.local_request', return_value={'events': []}), patch('backend.wearable.publish_feedback.post_feedback') as remote:
            self.assertEqual(sync_pending('local', 'remote', 'secret'), 0)
            remote.assert_not_called()
