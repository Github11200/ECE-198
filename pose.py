"""Reduce 17 COCO joints to an elbow angle and one curl state per seat."""
from dataclasses import dataclass
from math import acos, cos, degrees, hypot, isfinite, radians, sin

RIGHT_ARM = (6, 8, 10)  # COCO shoulder, elbow, wrist
MIN_CONFIDENCE = 0.4
LOWERED = 150
CURL_STARTED = 120
FULL_RANGE = 70
REPLAY_FPS = 10


def elbow_angle(keypoints):
    """Return the angle at the elbow in degrees, or None for unusable joints."""
    if not isinstance(keypoints, list) or len(keypoints) != 17 * 3:
        return None
    arm = [keypoints[index * 3:index * 3 + 3] for index in RIGHT_ARM]
    if any(not all(type(value) in (int, float) and -1_000_000 <= value <= 1_000_000 for value in joint)
           or joint[2] < MIN_CONFIDENCE for joint in arm):
        return None
    (sx, sy, _), (ex, ey, _), (wx, wy, _) = arm
    upper = (sx - ex, sy - ey)
    lower = (wx - ex, wy - ey)
    length = hypot(*upper) * hypot(*lower)
    if length < 1:
        return None
    cosine = (upper[0] * lower[0] + upper[1] * lower[1]) / length
    return degrees(acos(max(-1, min(1, cosine))))


def assign_lanes(detections, width, seats):
    """Use the box center to assign stationary demo seats from left to right."""
    by_lane = [[] for _ in range(seats)]
    for detection in detections:
        x, _, box_width, _ = detection["box"]
        center = x + box_width / 2
        if isfinite(center) and box_width > 0 and 0 <= center < width:
            lane = int(center * seats / width)
            by_lane[lane].append(detection["keypoints"])
    # An empty or contested lane cannot produce a rep.
    return [people[0] if len(people) == 1 else None for people in by_lane]


@dataclass
class Curl:
    """A rep starts below 120° and ends at 150° after a visible lowered pose."""
    target: int
    armed: bool = False
    minimum: float | None = None
    angle: float | None = None
    reps: int = 0
    full: int = 0
    last_range: str | None = None

    def observe(self, angle):
        self.angle = angle
        if angle is None:
            self.armed = False
            self.minimum = None
        elif angle >= LOWERED:
            if self.minimum is not None:
                self.reps += 1
                self.last_range = "Full range" if self.minimum <= FULL_RANGE else "Short range"
                self.full += self.minimum <= FULL_RANGE
            self.armed = True
            self.minimum = None
        elif self.armed and angle <= CURL_STARTED:
            self.minimum = angle if self.minimum is None else min(self.minimum, angle)

    def summary(self):
        return {"target": self.target, "reps": self.reps, "full": self.full,
                "short": self.reps - self.full, "last_range": self.last_range}

    def live(self):
        if self.angle is None:
            cue = "Waiting for a clear view"
        elif self.reps > self.target:
            cue = "Above rep target"
        elif self.reps == self.target:
            cue = "Target reached"
        elif self.last_range == "Short range":
            cue = "Check your range with the instructor"
        elif self.last_range == "Full range":
            cue = "Full range on last rep"
        else:
            cue = "Ready to count"
        return {**self.summary(), "angle": round(self.angle) if self.angle is not None else None,
                "cue": cue}


# Generated example motions. The replay uses the same COCO shape and angle math as the camera.
_CYCLE = (165, 160, 140, 115, 93, 60, 62, 89, 113, 141, 160, 165)
_MOTIONS = ((2, (), None), (3, (0, 2), None), (1, (), None),
            (2, (), 15), (3, (1,), None))
REPLAY_FRAMES = 49


def replay_frame(frame, seats):
    detections = []
    for index, (cycles, short_cycles, hide_frame) in enumerate(_MOTIONS[:seats]):
        tick = max(0, frame - index)
        if hide_frame is not None and hide_frame <= tick < hide_frame + 5:
            continue
        cycle, step = divmod(tick, len(_CYCLE))
        angle = _CYCLE[step] if cycle < cycles else 165
        if cycle in short_cycles:
            angle = max(angle, 95)

        x, y, length = index * 200 + 100, 165, 45
        keypoints = [0.0] * 51
        keypoints[18:21] = [x, y - length, 0.95]
        keypoints[24:27] = [x, y, 0.95]
        keypoints[30:33] = [
            x + length * sin(radians(angle)), y - length * cos(radians(angle)), 0.95,
        ]
        detections.append({"box": [x - 70, 50, 140, 220], "keypoints": keypoints})
    return assign_lanes(detections, seats * 200, seats)
