"""Fixed demonstration criteria, not individualized rehabilitation prescriptions."""
from copy import deepcopy
from .pose import Curl, MIN_CONFIDENCE, LOWERED, CURL_STARTED, FULL_RANGE, joint_angle

DEFAULT_EXERCISE = 'right_arm_curl'
_PARTS = {6: 'shoulder', 8: 'elbow', 10: 'wrist', 12: 'hip', 14: 'knee', 16: 'ankle'}
JOINT_NAMES = {**{joint: 'right ' + part for joint, part in _PARTS.items()},
               **{joint - 1: 'left ' + part for joint, part in _PARTS.items()}}


def mirror(groups):
    """COCO stores each left joint one index before its right counterpart."""
    return [tuple(joint - 1 for joint in group) for group in groups]


def sides(spec):
    """Joint groups for each body side; exercises are defined on the right side."""
    return {'right': spec['joints'], 'left': mirror(spec['joints'])}


def definition(label, category, joints, angle_label, rest, start, full, increasing, help_text):
    return dict(label=label, category=category, joints=joints, angle_label=angle_label,
                rest_angle=rest, start_angle=start, full_angle=full,
                increasing=increasing, help=help_text)


EXERCISES = {
    'right_arm_curl': definition('Seated arm curl', 'Strength', [(6, 8, 10)],
        'Elbow angle', LOWERED, CURL_STARTED, FULL_RANGE, False,
        'Keep one shoulder, elbow and wrist visible (left or right). Begin with the arm lowered.'),
    'pushup': definition('Pushups', 'Strength', [(6, 8, 10)],
        'Elbow angle', 150, 120, 90, False,
        'Use a side view with either arm visible. This estimates elbow range, not whole-body alignment.'),
    'squat': definition('Squats', 'Strength', [(12, 14, 16)],
        'Knee angle', 160, 130, 100, False,
        'Use a side view with the hip, knee and ankle of either leg visible. Begin standing.'),
    'knee_extension': definition('Seated knee extensions', 'Rehabilitation', [(12, 14, 16)],
        'Knee angle', 105, 125, 155, True,
        'Counts either leg. Keep its hip, knee and ankle visible; begin with the knee bent.'),
    'shoulder_raise': definition('Seated shoulder raises', 'Rehabilitation', [(12, 6, 8)],
        'Shoulder angle', 25, 45, 80, True,
        'Counts either arm moving out to the side and back down. Keep its hip, shoulder and elbow visible.'),
    'seated_march': definition('Seated marches', 'Rehabilitation', [(6, 12, 14)],
        'Hip angle', 85, 75, 60, False,
        'Counts knee lifts on either side. Use a side view with the shoulder, hip and knee visible.'),
    'sit_to_stand': definition('Sit-to-stand', 'Rehabilitation', [(12, 14, 16), (6, 12, 14)],
        'Minimum hip/knee angle', 105, 125, 155, True,
        'Keep the shoulder, hip, knee and ankle of one side visible. Both hip and knee must extend; a leg extension alone is not a stand.'),
}


def catalog():
    return [dict(id=key, **deepcopy(value), criteria=criteria(value)) for key, value in EXERCISES.items()]


def criteria(spec):
    rest, start, full = (spec[key] for key in ('rest_angle', 'start_angle', 'full_angle'))
    if spec['increasing']:
        return f'Start/return at ≤{rest}°. Attempt begins at ≥{start}°. Target range reached at ≥{full}°.'
    return f'Start/return at ≥{rest}°. Attempt begins at ≤{start}°. Target range reached at ≤{full}°.'


def counter(exercise_id, target):
    spec = EXERCISES[exercise_id]
    return Curl(target, rest_angle=spec['rest_angle'], start_angle=spec['start_angle'],
                full_angle=spec['full_angle'], increasing=spec['increasing'])


def measure(keypoints, exercise_id):
    spec = EXERCISES[exercise_id]
    if keypoints is None:
        return None, 'No unique usable person in this lane'
    if not isinstance(keypoints, list) or len(keypoints) != 51:
        return None, 'Invalid pose data'
    angles, weak_sides = [], []
    for groups in sides(spec).values():
        required = sorted({joint for group in groups for joint in group})
        weak = [JOINT_NAMES[joint] for joint in required
                if type(keypoints[joint * 3 + 2]) not in (int, float)
                or not MIN_CONFIDENCE <= keypoints[joint * 3 + 2] <= 1_000_000]
        if weak:
            weak_sides.append(weak)
            continue
        side = [joint_angle(keypoints, group) for group in groups]
        if all(angle is not None for angle in side):
            # Within one side every group must move (sit-to-stand needs hip and knee).
            angles.append(min(side) if spec['increasing'] else max(side))
    if angles:
        # Either side may be the working one; follow whichever is further into the movement.
        return (max(angles) if spec['increasing'] else min(angles)), 'Tracking'
    if len(weak_sides) == 2:
        return None, 'Low confidence in ' + ', '.join(min(weak_sides, key=len))
    return None, 'Joint geometry unavailable'


def report(person, metrics, exercise_id):
    spec = EXERCISES[exercise_id]
    score = round(person.full * 100 / person.reps) if person.reps else None
    issues = []
    short = person.reps - person.full
    if short:
        issues.append(f'{short} attempt(s) did not reach the target range')
    if person.discarded_attempts:
        issues.append(f'{person.discarded_attempts} unfinished attempt(s) discarded after tracking loss')
    remaining = max(0, person.target - person.reps)
    if remaining:
        issues.append(f'{remaining} rep(s) remaining to target')
    if person.reps > person.target:
        issues.append(f'{person.reps - person.target} rep(s) above target')
    samples, valid = metrics['samples'], metrics['valid_samples']
    coverage = round(valid * 100 / samples) if samples else None
    if coverage is not None and coverage < 90:
        issues.append(f'Usable pose in {coverage}% of submitted frames; review tracking')
    return dict(range_score=score, target_remaining=remaining, tracking_coverage=coverage,
                tracking_losses=metrics['tracking_losses'], discarded_attempts=person.discarded_attempts,
                issues=issues, rep_details=[dict(number=index, peak_angle=angle,
                    reached_range=angle >= spec['full_angle'] if spec['increasing'] else angle <= spec['full_angle'])
                    for index, angle in enumerate(person.rep_angles, 1)])
