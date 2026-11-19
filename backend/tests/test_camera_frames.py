"""Camera preview HTTP contract over a real local server."""
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.tracker.server import SessionService, handler_for


class CameraFrameTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.service = SessionService(Path(temporary.name) / 'sessions.sqlite3')
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(self.service, 0))
        self.server.RequestHandlerClass = handler_for(self.service, self.server.server_port)
        self.base = f'http://127.0.0.1:{self.server.server_port}'
        worker = Thread(target=self.server.serve_forever, daemon=True)
        worker.start()

        def stop():
            self.server.shutdown()
            worker.join(timeout=3)
            self.server.server_close()
        self.addCleanup(stop)

    def request(self, path, data=None, headers=None):
        try:
            with urlopen(Request(self.base + path, data=data, headers=headers or {}), timeout=3) as response:
                return response.status, response.headers, response.read()
        except HTTPError as error:
            with error:
                return error.code, error.headers, error.read()

    def start(self, source='camera'):
        return self.service.start({'source': source, 'targets': [1]})['id']

    def post(self, session_id, frame, headers=None):
        return self.request('/api/camera/frame?session_id=' + session_id, frame,
                            {'Content-Type': 'image/jpeg', **(headers or {})})

    def test_frame_post_get_and_first_stream_part(self):
        session_id = self.start()
        self.assertEqual(self.request('/api/camera/frame.jpg')[0], 204)
        frame = b'\xff\xd8preview\xff\xd9'
        status, _, body = self.post(session_id, frame)
        self.assertEqual((status, json.loads(body)), (200, {'ok': True, 'seq': 1}))
        status, headers, body = self.request('/api/camera/frame.jpg')
        self.assertEqual((status, headers['Content-Type'], body), (200, 'image/jpeg', frame))
        with urlopen(self.base + '/api/camera/stream', timeout=3) as stream:
            self.assertEqual(stream.headers['Content-Type'], 'multipart/x-mixed-replace; boundary=frame')
            self.assertIsNone(stream.headers.get('Content-Length'))
            self.assertEqual(stream.headers['Cache-Control'], 'no-store')
            self.assertEqual(stream.headers['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(stream.read(len(b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ')),
                             b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ')
            self.assertEqual(stream.read(len(str(len(frame))) + 4), str(len(frame)).encode() + b'\r\n\r\n')
            self.assertEqual(stream.read(len(frame) + 2), frame + b'\r\n')

    def test_rejects_other_sessions_types_and_oversized_frames(self):
        session_id = self.start()
        self.assertEqual(self.post('0' * 32, b'x')[0], 409)
        self.assertEqual(self.post(session_id, b'x', {'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.post(session_id, b'x', {'Origin': 'http://elsewhere.test'})[0], 403)
        self.assertEqual(self.post(session_id, b'')[0], 400)
        self.assertEqual(self.post(session_id, b'x' * 2_000_001)[0], 413)
        self.assertEqual(self.post(session_id, b'x')[0], 200)

    def test_frame_clears_on_finish_and_next_session(self):
        session_id = self.start()
        self.post(session_id, b'old')
        self.service.finish({'session_id': session_id})
        self.assertIsNone(self.service.frame)
        self.assertEqual(self.request('/api/camera/frame.jpg')[0], 404)
        self.assertEqual(self.request('/api/camera/stream')[0], 404)
        next_id = self.start()
        self.assertNotEqual(next_id, session_id)
        self.assertEqual(self.request('/api/camera/frame.jpg')[0], 204)
        self.assertEqual(self.post(session_id, b'old')[0], 409)
        self.assertEqual(json.loads(self.post(next_id, b'new')[2])['seq'], 2)


if __name__ == '__main__':
    unittest.main()
