"""The exported portal shares the original API without exposing local files."""
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.tracker import server as app


class FrontendTests(unittest.TestCase):
    def test_export_routes_legacy_fallback_and_session_contract(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'legacy-dashboard').mkdir()
            (root / 'legacy-dashboard' / 'index.html').write_text('Original tracker', encoding='utf-8')
            (root / 'private.txt').write_text('must stay private', encoding='utf-8')
            service = app.SessionService(root / 'sessions.sqlite3')
            server = ThreadingHTTPServer(('127.0.0.1', 0), app.handler_for(service, 0))
            server.RequestHandlerClass = app.handler_for(service, server.server_port)
            base = f'http://127.0.0.1:{server.server_port}'
            worker = Thread(target=server.serve_forever, daemon=True)
            with patch.object(app, 'ROOT', root):
                worker.start()
                try:
                    def get(path):
                        with urlopen(base + path, timeout=3) as response:
                            return response.read().decode('utf-8')

                    self.assertEqual(get('/'), 'Original tracker')
                    export = root / 'frontend' / 'out'
                    (export / 'admin').mkdir(parents=True)
                    (export / 'index.html').write_text('Clinic home', encoding='utf-8')
                    (export / 'admin' / 'index.html').write_text('Connected admin', encoding='utf-8')
                    (export / 'admin' / 'index.txt').write_text('Next navigation data', encoding='utf-8')
                    self.assertEqual(get('/'), 'Clinic home')
                    self.assertEqual(get('/admin/'), 'Connected admin')
                    self.assertEqual(get('/admin'), 'Connected admin')
                    self.assertEqual(get('/admin/index.txt?_rsc=demo'), 'Next navigation data')
                    self.assertEqual(get('/tracker'), 'Original tracker')
                    for path in ('/../private.txt', '/%2e%2e/private.txt', '/%5c..%5cprivate.txt', '/unknown-page/'):
                        with self.assertRaises(HTTPError) as error:
                            get(path)
                        self.assertEqual(error.exception.code, 404)
                        error.exception.close()
                    self.assertIsNone(json.loads(get('/api/session'))['session'])
                    self.assertIn('squat', {exercise['id'] for exercise in json.loads(get('/api/exercises'))['exercises']})
                    body = json.dumps(dict(source='camera', exercise='squat', station='Station B',
                                           participant_ids=['P01', 'P02', 'P03'], targets=[10, 10, 10])).encode()
                    with urlopen(Request(base + '/api/session/start', data=body, headers={
                            'Content-Type': 'application/json', 'Origin': base}), timeout=3) as response:
                        active = json.load(response)
                    self.assertEqual([p['target'] for p in active['participants']], [10, 10, 10])
                    self.assertEqual(service.current()['id'], active['id'])
                    finish = json.dumps({'session_id': active['id']}).encode()
                    with urlopen(Request(base + '/api/session/finish', data=finish, headers={
                            'Content-Type': 'application/json', 'Origin': base}), timeout=3) as response:
                        saved = json.load(response)
                    self.assertEqual([p['reps'] for p in saved['participants']], [0, 0, 0])
                    self.assertIn('CCCARE workout report', get('/reports/' + saved['id']))
                    restarted = app.SessionService(service.db_path)
                    self.assertEqual(json.loads(get('/api/history'))['sessions'][0]['id'], saved['id'])
                    self.assertIsNone(restarted.current())
                finally:
                    server.shutdown()
                    worker.join(timeout=3)
                    server.server_close()
