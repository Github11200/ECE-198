"""A completed session and all its participant results commit together."""
from contextlib import contextmanager
import sqlite3
import json
from .exercises import DEFAULT_EXERCISE, EXERCISES, criteria


@contextmanager
def connect(path):
    database = sqlite3.connect(path)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    try:
        with database:
            yield database
    finally:
        database.close()


def initialize(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS convex_outbox (
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                payload TEXT NOT NULL,
                delivered INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS outbox_pending ON convex_outbox(delivered, sequence);
            CREATE TABLE IF NOT EXISTS participants (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL CHECK (source IN ('replay', 'camera', 'recording')),
                started_at TEXT NOT NULL,
                finished_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS results (
                session_id TEXT REFERENCES sessions(id),
                participant_id TEXT REFERENCES participants(id),
                target INTEGER NOT NULL CHECK (target > 0),
                reps INTEGER NOT NULL CHECK (reps >= 0),
                full INTEGER NOT NULL CHECK (full BETWEEN 0 AND reps),
                last_range TEXT,
                PRIMARY KEY (session_id, participant_id)
            );
        """)
        # Additive migrations preserve already saved camera/replay history.
        for table, columns in {
            'sessions': {'exercise': "TEXT NOT NULL DEFAULT 'right_arm_curl'",
                         'station': "TEXT NOT NULL DEFAULT 'Station 1'",
                         'settings_json': "TEXT NOT NULL DEFAULT '{}'"},
            'results': {'lane': 'INTEGER NOT NULL DEFAULT 0',
                        'details_json': "TEXT NOT NULL DEFAULT '{}'"},
        }.items():
            existing = {row['name'] for row in db.execute(f'PRAGMA table_info({table})')}
            for column, declaration in columns.items():
                if column not in existing:
                    db.execute(f'ALTER TABLE {table} ADD COLUMN {column} {declaration}')

        for saved in db.execute("""SELECT * FROM sessions
            WHERE NOT EXISTS (SELECT 1 FROM convex_outbox WHERE event_id = 'import:' || sessions.id)
            ORDER BY finished_at"""):
            snapshot = _with_results(db, saved)
            _enqueue(db, 'import', snapshot, event_id='import:' + snapshot['id'])


def save(path, session):
    with connect(path) as db:
        db.execute("INSERT INTO sessions (id, source, started_at, finished_at, exercise, station, settings_json) VALUES (?, ?, ?, ?, ?, ?, ?)", (
            session["id"], session["source"], session["started_at"], session["finished_at"],
            session.get('exercise', DEFAULT_EXERCISE), session.get('station', 'Station 1'),
            json.dumps({'exercise_label': session.get('exercise_label'), 'criteria': session.get('criteria')}),
        ))
        _enqueue(db, "finish", session)
        for person in session["participants"]:
            db.execute("INSERT OR IGNORE INTO participants VALUES (?, ?)", (person["id"], person["label"]))
            details = {key: person[key] for key in ('range_score', 'target_remaining', 'tracking_coverage',
                       'tracking_losses', 'discarded_attempts', 'issues', 'rep_details') if key in person}
            db.execute("INSERT INTO results (session_id, participant_id, target, reps, full, last_range, lane, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (
                session["id"], person["id"], person["target"], person["reps"],
                person["full"], person["last_range"],
                person.get('lane', 0), json.dumps(details),
            ))


def _with_results(db, session):
    rows = db.execute("""
        SELECT participants.id, participants.label, target, reps, full, reps - full AS short, last_range, lane, details_json
        FROM results JOIN participants ON participants.id = results.participant_id
        WHERE session_id = ?
        ORDER BY lane, participant_id
    """, (session["id"],))
    people = []
    for index, row in enumerate(rows, 1):
        person = dict(row)
        details = json.loads(person.pop('details_json'))
        person['lane'] = person['lane'] or index
        person.update(details)
        if not details:
            person.update(range_score=round(person['full'] * 100 / person['reps']) if person['reps'] else None,
                          target_remaining=max(0, person['target'] - person['reps']), tracking_coverage=None,
                          tracking_losses=None, discarded_attempts=None, rep_details=[],
                          issues=['Legacy session: tracking diagnostics were not recorded'])
        people.append(person)
    result = dict(session)
    settings = json.loads(result.pop('settings_json'))
    spec = EXERCISES.get(result['exercise'], EXERCISES[DEFAULT_EXERCISE])
    return {**result, 'exercise_label': settings.get('exercise_label') or spec['label'],
            'criteria': settings.get('criteria') or dict(
                **{key: spec[key] for key in ('rest_angle', 'start_angle', 'full_angle', 'increasing', 'angle_label')},
                description=criteria(spec), minimum_confidence=0.4), 'participants': people}


def history(path):
    with connect(path) as db:
        sessions = db.execute("SELECT * FROM sessions ORDER BY finished_at DESC LIMIT 30")
        return [_with_results(db, session) for session in sessions]


def find(path, session_id):
    with connect(path) as db:
        session = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _with_results(db, session) if session else None


def _enqueue(db, kind, snapshot, pose=None, event_id=None):
    from uuid import uuid4
    payload = {'kind': kind, 'snapshot': snapshot}
    if pose is not None:
        payload['pose'] = pose
    db.execute('INSERT OR IGNORE INTO convex_outbox (event_id, payload) VALUES (?, ?)',
               (event_id or uuid4().hex, json.dumps(payload, allow_nan=False)))


def enqueue(path, kind, snapshot, pose=None):
    with connect(path) as db:
        _enqueue(db, kind, snapshot, pose)


def pending(path, limit=25):
    with connect(path) as db:
        rows = db.execute('SELECT sequence, event_id, payload FROM convex_outbox WHERE delivered = 0 ORDER BY sequence LIMIT ?', (limit,))
        return [{**json.loads(row['payload']), 'eventId': row['event_id'], 'sequence': row['sequence']} for row in rows]


def acknowledge(path, event_id):
    with connect(path) as db:
        db.execute('UPDATE convex_outbox SET delivered = 1 WHERE event_id = ?', (event_id,))


def sync_status(path):
    with connect(path) as db:
        return {'pending': db.execute('SELECT COUNT(*) FROM convex_outbox WHERE delivered = 0').fetchone()[0]}
