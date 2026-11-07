"""A completed session and all its participant results commit together."""
from contextlib import contextmanager
import sqlite3


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


def save(path, session):
    with connect(path) as db:
        db.execute("INSERT INTO sessions VALUES (?, ?, ?, ?)", (
            session["id"], session["source"], session["started_at"], session["finished_at"],
        ))
        for person in session["participants"]:
            db.execute("INSERT OR IGNORE INTO participants VALUES (?, ?)", (person["id"], person["label"]))
            db.execute("INSERT INTO results VALUES (?, ?, ?, ?, ?, ?)", (
                session["id"], person["id"], person["target"], person["reps"],
                person["full"], person["last_range"],
            ))


def _with_results(db, session):
    rows = db.execute("""
        SELECT participants.id, participants.label, target, reps, full, reps - full AS short, last_range
        FROM results JOIN participants ON participants.id = results.participant_id
        WHERE session_id = ?
        ORDER BY participant_id
    """, (session["id"],))
    return {**dict(session), "participants": [dict(row) for row in rows]}


def history(path):
    with connect(path) as db:
        sessions = db.execute("SELECT * FROM sessions ORDER BY finished_at DESC LIMIT 30")
        return [_with_results(db, session) for session in sessions]


def find(path, session_id):
    with connect(path) as db:
        session = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return _with_results(db, session) if session else None
