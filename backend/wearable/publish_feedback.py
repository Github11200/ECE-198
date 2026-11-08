"""Mirror compact demo cues from the laptop to the optional Convex relay."""
import argparse
import json
import os
import sys
from time import monotonic, sleep
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


def post_feedback(url, token, payload):
    request = Request(url, data=json.dumps(payload).encode(), headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    with urlopen(request, timeout=2):
        pass


def sync_pending(local, remote, token):
    """Only acknowledge locally after Convex commits; retries reuse event IDs."""
    events = local_request(local, "/api/convex/pending")["events"]
    for event in events:
        post_feedback(remote + "/archive", token, {"event": event})
        local_request(local, "/api/convex/ack", {"eventId": event["eventId"]})
    return len(events)


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
    remote = args.url.rstrip("/") + "/feedback"
    print("Publishing demo feedback to Convex. Press Ctrl+C to stop.", flush=True)
    last_payload, last_sent = None, 0
    try:
        while True:
            try:
                sync_pending(local, args.url.rstrip("/"), token)
                current = local_request(local, "/api/session")["session"]
                payload = publisher_payload(current)
                if payload != last_payload or (payload["session"] and monotonic() - last_sent >= 2):
                    post_feedback(remote, token, payload)
                    last_payload, last_sent = payload, monotonic()
                sleep(0.25)
            except (OSError, ValueError) as error:
                print(f"Feedback relay retrying: {error}", file=sys.stderr, flush=True)
                sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
