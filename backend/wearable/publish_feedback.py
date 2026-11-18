"""Mirror compact demo cues from the laptop to the optional Convex relay."""
import argparse
import json
import os
import sys
from threading import Event, Thread
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from ..camera.bridge import local_request

DISPLAY_TEXT = {
    'READY': 'Ready',
    'RANGE_OK': 'Range reached',
    'CHECK_RANGE': 'Check range',
    'TRACKING_LOST': 'Tracking lost',
    'TARGET_REACHED': 'Target reached',
    'ABOVE_TARGET': 'Above target',
}


def participant_feedback(person):
    """Stable firmware codes plus short display text; scoring stays on laptop."""
    if person.get('angle') is None:
        code = 'TRACKING_LOST'
    elif person.get('last_range') == 'Short range':
        code = 'CHECK_RANGE'
    elif person['reps'] > person['target']:
        code = 'ABOVE_TARGET'
    elif person['reps'] == person['target']:
        code = 'TARGET_REACHED'
    elif person.get('last_range') == 'Full range':
        code = 'RANGE_OK'
    else:
        code = 'READY'
    score = person.get('range_score')
    if score is None and person['reps'] and 'full' in person:
        score = round(person['full'] * 100 / person['reps'])
    return {**{field: person[field] for field in ('id', 'reps', 'target', 'cue')},
            'angle': person.get('angle'),
            'cue_code': code, 'display_text': DISPLAY_TEXT[code], 'range_score': score}


def wearable_snapshot(session):
    if session is None:
        return {"session": None}
    return {"session": {
        "id": session["id"],
        "source": session["source"],
        'exercise': session.get('exercise', 'right_arm_curl'),
        'station': session.get('station', 'Station 1'),
        'frame': session.get('last_frame'),
        "participants": [
            participant_feedback(person)
            for person in session["participants"]
        ],
    }}


def publisher_payload(session):
    """Publish compact wearable cues and the same full dashboard snapshot atomically."""
    return {**wearable_snapshot(session), "dashboard": session}


def post_feedback(url, token, payload, timeout=2):
    request = Request(url, data=json.dumps(payload).encode(), headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    with urlopen(request, timeout=timeout):
        pass


BATCH_SIZE = 100          # Convex /archive accepts 1-100 events per atomic batch.
ARCHIVE_TIMEOUT = 10      # A full batch is larger than a live cue; allow a slower uplink.


class AuthorizationError(Exception):
    """Convex rejected the publish token: keep every event and retry."""


def _log(message):
    print(message, file=sys.stderr, flush=True)


def _permanent(error):
    """A 4xx other than 401/429 is a rejection that retrying cannot fix."""
    return isinstance(error, HTTPError) and 400 <= error.code < 500 and error.code not in (401, 429)


def _response_body(error):
    try:
        return error.read(2000).decode("utf-8", "replace")
    except (OSError, ValueError):
        return ""


def _post_archive(remote, token, body):
    """POST to /archive. Raise AuthorizationError for 401; other errors propagate."""
    try:
        post_feedback(remote + "/archive", token, body, timeout=ARCHIVE_TIMEOUT)
    except HTTPError as error:
        if error.code == 401:
            error.close()
            raise AuthorizationError(
                "Convex rejected FEEDBACK_PUBLISH_TOKEN (401). Events stay queued; "
                "fix the token on the laptop or the deployment.") from None
        raise


def sync_pending(local, remote, token):
    """Upload one batch of queued archive events; returns how many were settled.

    Events are acknowledged locally only after Convex commits them (204), so a
    lost acknowledgement just resends the same event IDs. If Convex rejects a
    batch (4xx), the events are retried one at a time: valid ones are
    committed, and a permanently rejected one is dead-lettered (kept in SQLite,
    removed from the upload queue) and logged, so it cannot block the queue.
    Network errors, 429 and 5xx propagate for a later retry; a 401 raises
    AuthorizationError and drops nothing.
    """
    events = local_request(local, f"/api/convex/pending?limit={BATCH_SIZE}")["events"]
    if not events:
        return 0
    try:
        _post_archive(remote, token, {"events": events})
    except HTTPError as error:
        if not _permanent(error):
            raise
        body = _response_body(error)
        error.close()
        if len(events) == 1:
            _dead_letter(local, events[0], error.code, body)
            return 1
        _log(f"Archive batch of {len(events)} rejected ({error.code} {body}); retrying events individually.")
        settled = 0
        for event in events:
            try:
                _post_archive(remote, token, {"event": event})
            except HTTPError as single:
                if not _permanent(single):
                    raise
                _dead_letter(local, event, single.code, _response_body(single))
                single.close()
            else:
                local_request(local, "/api/convex/ack", {"eventIds": [event["eventId"]]})
            settled += 1
        return settled
    local_request(local, "/api/convex/ack", {"eventIds": [event["eventId"] for event in events]})
    return len(events)


def _dead_letter(local, event, status, body):
    _log(f"ARCHIVE EVENT PERMANENTLY REJECTED: eventId={event.get('eventId')} kind={event.get('kind')} "
         f"sequence={event.get('sequence')} status={status} response={body!r}. "
         "It is kept in SQLite as dead-lettered and will not be retried.")
    local_request(local, "/api/convex/ack", {"eventIds": [event["eventId"]], "dead_letter": True})


HEARTBEAT_SECONDS = 2


def publish_live(local, base, token, state):
    """Publish the live cue/dashboard when it changes, plus a heartbeat while active."""
    current = local_request(local, "/api/session")["session"]
    payload = publisher_payload(current)
    if payload != state.get("payload") or (
            payload["session"] and monotonic() - state.get("sent", 0) >= HEARTBEAT_SECONDS):
        post_feedback(base + "/feedback", token, payload)
        state["payload"], state["sent"] = payload, monotonic()


def archive_loop(local, base, token, stop):
    """Drain the durable queue on its own thread so uploads never delay live feedback."""
    while not stop.is_set():
        try:
            settled = sync_pending(local, base, token)
            stop.wait(0 if settled >= BATCH_SIZE else 0.25)
        except AuthorizationError as error:
            _log(f"Archive upload paused: {error}")
            stop.wait(5)
        except (OSError, ValueError, KeyError) as error:
            _log(f"Archive upload retrying: {error}")
            stop.wait(1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--url", required=True, help="Convex site URL, such as https://NAME.convex.site")
    args = parser.parse_args()
    destination = urlsplit(args.url)
    if destination.scheme != "https" or not destination.hostname or not destination.hostname.endswith(".convex.site"):
        parser.error("Use the HTTPS URL of the Convex deployment ending in .convex.site.")
    if destination.path not in ("", "/") or destination.query or destination.fragment:
        parser.error("Supply the base deployment URL without a path or query.")
    token = os.environ.get("FEEDBACK_PUBLISH_TOKEN")
    if not token:
        parser.error("Set FEEDBACK_PUBLISH_TOKEN to the deployment's publish token.")
    local = f"http://127.0.0.1:{args.port}"
    base = args.url.rstrip("/")
    print("Publishing demo feedback to Convex. Press Ctrl+C to stop.", flush=True)
    stop = Event()
    uploader = Thread(target=archive_loop, args=(local, base, token, stop), daemon=True)
    uploader.start()
    state = {}
    try:
        while True:
            try:
                publish_live(local, base, token, state)
                sleep(0.25)
            except HTTPError as error:
                hint = " (check FEEDBACK_PUBLISH_TOKEN)" if error.code == 401 else ""
                _log(f"Live feedback retrying: HTTP {error.code}{hint} {_response_body(error)}")
                error.close()
                sleep(1)
            except (OSError, ValueError, KeyError) as error:
                _log(f"Live feedback retrying: {error}")
                sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        uploader.join(timeout=ARCHIVE_TIMEOUT + 3)


if __name__ == "__main__":
    main()
