"""HTTP routing/error contracts, archive batching/dead-lettering, and live feed independence."""
from http.server import ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Event, Thread
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.tracker import database
from backend.tracker import server as app
from backend.wearable import publish_feedback as relay


class LiveServer:
    def __init__(self, test):
        temporary = TemporaryDirectory()
        test.addCleanup(temporary.cleanup)
        self.service = app.SessionService(Path(temporary.name) / 'sessions.sqlite3')
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), app.handler_for(self.service, 0))
        self.server.RequestHandlerClass = app.handler_for(self.service, self.server.server_port)
        self.base = f'http://127.0.0.1:{self.server.server_port}'
        worker = Thread(target=self.server.serve_forever, daemon=True)
        worker.start()

        def stop():
            self.server.shutdown()
            worker.join(timeout=3)
            self.server.server_close()
        test.addCleanup(stop)

    def request(self, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        headers = {'Content-Type': 'application/json'} if data is not None else {}
        try:
            with urlopen(Request(self.base + path, data=data, headers=headers), timeout=3) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            with error:
                return error.code, json.load(error)


class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.live = LiveServer(self)

    def test_api_and_report_routes_ignore_query_strings(self):
        self.assertEqual(self.live.request('/api/session?t=1'), (200, {'session': None}))
        self.assertEqual(self.live.request('/api/convex/status?t=1'), (200, {'pending': 0, 'dead_letter': 0}))
        status, started = self.live.request('/api/session/start?x=1', {'source': 'replay', 'targets': [1]})
        self.assertEqual(status, 201)
        status, saved = self.live.request('/api/session/finish', {'session_id': started['id']})
        self.assertEqual(status, 200)
        with urlopen(f"{self.live.base}/reports/{saved['id']}?print=1", timeout=3) as response:
            self.assertIn('CCCARE workout report', response.read().decode())

    def test_pending_limit_parameter(self):
        self.live.request('/api/session/start', {'source': 'camera', 'targets': [1]})
        for frame in range(30):
            self.live.request('/api/pose', {'session_id': self.live.service.active.id, 'frame': frame, 'poses': [None]})
        self.assertEqual(len(self.live.request('/api/convex/pending')[1]['events']), 25)
        self.assertEqual(len(self.live.request('/api/convex/pending?limit=100')[1]['events']), 31)
        for bad in ('0', '101', 'x', '-1'):
            with self.subTest(limit=bad):
                self.assertEqual(self.live.request('/api/convex/pending?limit=' + bad)[0], 400)

    def test_ack_rejects_malformed_ids_with_json_error_and_accepts_batches(self):
        # Previously a list eventId reached sqlite and dropped the connection with no response.
        for body in ({'eventId': ['x']}, {'eventId': 5}, {}, {'eventId': ''}, {'eventIds': []},
                     {'eventIds': ['a', 7]}, {'eventIds': ['a'] * 101}, {'eventIds': ['a'], 'dead_letter': 'yes'}):
            with self.subTest(body=body):
                status, result = self.live.request('/api/convex/ack', body)
                self.assertEqual(status, 400)
                self.assertIsInstance(result['error'], str)
        self.live.request('/api/session/start', {'source': 'camera', 'targets': [1]})
        self.live.request('/api/pose', {'session_id': self.live.service.active.id, 'frame': 0, 'poses': [None]})
        first, second = database.pending(self.live.service.db_path)
        self.assertEqual(self.live.request('/api/convex/ack', {'eventId': first['eventId']}), (200, {'ok': True}))
        self.assertEqual(self.live.request('/api/convex/ack', {'eventIds': [second['eventId']], 'dead_letter': True}),
                         (200, {'ok': True}))
        self.assertEqual(self.live.request('/api/convex/status'), (200, {'pending': 0, 'dead_letter': 1}))

    def test_unexpected_error_returns_json_500(self):
        with patch.object(database, 'history', side_effect=RuntimeError('boom')), \
                patch.object(self.live.server.RequestHandlerClass, 'log_error'):
            status, result = self.live.request('/api/history')
        self.assertEqual(status, 500)
        self.assertIn('error', result)
        self.assertEqual(self.live.request('/api/session'), (200, {'session': None}))


def http_error(code, body=b'{"error": "Invalid archive event"}'):
    return HTTPError('https://x.convex.site/archive', code, 'error', {}, BytesIO(body))


def queued(count):
    return [{'eventId': f'e{index}', 'sequence': index + 1, 'kind': 'update'} for index in range(count)]


class FakeTracker:
    """In-memory /api/convex/pending and /ack with the server's contract."""
    def __init__(self, events):
        self.events, self.acked, self.dead = list(events), [], []

    def __call__(self, base, route, data=None):
        if route.startswith('/api/convex/pending'):
            limit = int(route.partition('limit=')[2] or 25)
            done = set(self.acked) | set(self.dead)
            return {'events': [e for e in self.events if e['eventId'] not in done][:limit]}
        if route == '/api/convex/ack':
            (self.dead if data.get('dead_letter') else self.acked).extend(data['eventIds'])
            return {'ok': True}
        raise AssertionError(route)


class RelayBatchTests(unittest.TestCase):
    def run_sync(self, tracker, remote):
        with patch.object(relay, 'local_request', side_effect=tracker), \
                patch.object(relay, 'post_feedback', side_effect=remote), \
                patch.object(relay, '_log') as log:
            return relay.sync_pending('http://local', 'https://x.convex.site', 'token'), log

    def test_sends_one_batch_of_at_most_100_and_acks_after_commit(self):
        tracker, bodies = FakeTracker(queued(150)), []
        settled, _ = self.run_sync(tracker, lambda url, token, body, timeout=2: bodies.append((url, body)))
        self.assertEqual(settled, 100)
        self.assertEqual(len(bodies), 1)
        self.assertEqual(bodies[0][0], 'https://x.convex.site/archive')
        self.assertEqual([e['eventId'] for e in bodies[0][1]['events']], [f'e{i}' for i in range(100)])
        self.assertEqual(tracker.acked, [f'e{i}' for i in range(100)])
        settled, _ = self.run_sync(tracker, lambda url, token, body, timeout=2: bodies.append((url, body)))
        self.assertEqual(settled, 50)

    def test_rejected_batch_falls_back_to_single_events_and_dead_letters_the_poison(self):
        tracker, sent = FakeTracker(queued(4)), []

        def remote(url, token, body, timeout=2):
            if 'events' in body:
                raise http_error(400)
            sent.append(body['event']['eventId'])
            if body['event']['eventId'] == 'e1':
                raise http_error(400, b'{"error": "Invalid session participants"}')

        settled, log = self.run_sync(tracker, remote)
        self.assertEqual(settled, 4)
        self.assertEqual(sent, ['e0', 'e1', 'e2', 'e3'])
        self.assertEqual(tracker.acked, ['e0', 'e2', 'e3'])
        self.assertEqual(tracker.dead, ['e1'])
        message = ' '.join(str(call.args[0]) for call in log.call_args_list)
        self.assertIn('eventId=e1', message)
        self.assertIn('Invalid session participants', message)
        self.assertEqual(self.run_sync(tracker, remote)[0], 0)  # The queue is no longer blocked.

    def test_transient_errors_and_401_never_drop_events(self):
        for error in (OSError('network down'), http_error(500), http_error(503), http_error(429)):
            with self.subTest(error=error):
                tracker = FakeTracker(queued(3))
                with self.assertRaises(OSError):
                    self.run_sync(tracker, Mock(side_effect=error))
                self.assertEqual((tracker.acked, tracker.dead), ([], []))
        tracker = FakeTracker(queued(3))
        with self.assertRaises(relay.AuthorizationError):
            self.run_sync(tracker, Mock(side_effect=http_error(401)))
        self.assertEqual((tracker.acked, tracker.dead), ([], []))

    def test_transient_error_during_single_event_fallback_keeps_the_rest_queued(self):
        tracker = FakeTracker(queued(3))

        def remote(url, token, body, timeout=2):
            if 'events' in body:
                raise http_error(400)
            if body['event']['eventId'] == 'e1':
                raise http_error(502)

        with self.assertRaises(HTTPError):
            self.run_sync(tracker, remote)
        self.assertEqual((tracker.acked, tracker.dead), (['e0'], []))


class RelayLiveIndependenceTests(unittest.TestCase):
    def test_live_feedback_keeps_publishing_while_archive_upload_is_stuck(self):
        session = app.Session('replay', [3]).snapshot()
        archive_started, release, live_posts = Event(), Event(), []

        def local(base, route, data=None):
            if route == '/api/session':
                return {'session': session}
            if route.startswith('/api/convex/pending'):
                return {'events': queued(1)}
            return {'ok': True}

        def remote(url, token, body, timeout=2):
            if url.endswith('/archive'):
                archive_started.set()
                release.wait(5)  # A slow uplink holding a large batch.
            else:
                live_posts.append(body)

        stop = Event()
        with patch.object(relay, 'local_request', side_effect=local), \
                patch.object(relay, 'post_feedback', side_effect=remote):
            uploader = Thread(target=relay.archive_loop, args=('l', 'https://x.convex.site', 't', stop), daemon=True)
            uploader.start()
            try:
                self.assertTrue(archive_started.wait(2))
                state = {}
                relay.publish_live('l', 'https://x.convex.site', 't', state)
                state['sent'] -= relay.HEARTBEAT_SECONDS  # Make the heartbeat due.
                relay.publish_live('l', 'https://x.convex.site', 't', state)
            finally:
                stop.set()
                release.set()
                uploader.join(3)
        self.assertEqual(live_posts, [relay.publisher_payload(session)] * 2)


if __name__ == '__main__':
    unittest.main()
