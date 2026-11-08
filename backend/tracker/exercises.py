"""Fixed demonstration criteria, not individualized rehabilitation prescriptions."""
from copy import deepcopy
from .pose import Curl, MIN_CONFIDENCE, LOWERED, CURL_STARTED, FULL_RANGE, joint_angle

DEFAULT_EXERCISE = 'right_arm_curl'
JOINT_NAMES = {6: 'right shoulder', 8: 'right elbow', 10: 'right wrist',
               12: 'right hip', 14: 'right knee', 16: 'right ankle'}


def definition(label, category, joints, angle_label, rest, start, full, increasing, help_text):
    return dict(label=label, category=category, joints=joints, angle_label=angle_label,
                rest_angle=rest, start_angle=start, full_angle=full,
                increasing=increasing, help=help_text)


EXERCISES = {
    'right_arm_curl': definition('Seated right-arm curl', 'Strength', [(6, 8, 10)],
        'Right elbow angle', LOWERED, CURL_STARTED, FULL_RANGE, False,
        'Keep the right shoulder, elbow and wrist visible. Begin with the arm lowered.'),
    'pushup': definition('Pushups', 'Strength', [(6, 8, 10)],
        'Right elbow angle', 150, 120, 90, False,
        'Use a side view with the right arm visible. This estimates elbow range, not whole-body alignment.'),
    'squat': definition('Squats', 'Strength', [(12, 14, 16)],
        'Right knee angle', 160, 130, 100, False,
        'Use a side view with the right hip, knee and ankle visible. Begin standing.'),
    'knee_extension': definition('Seated knee extensions', 'Rehabilitation demo', [(12, 14, 16)],
        'Right knee angle', 105, 125, 155, True,
        'Count the right leg. Keep the hip, knee and ankle visible; begin with the knee bent.'),
    'shoulder_raise': definition('Seated shoulder raises', 'Rehabilitation demo', [(12, 6, 8)],
        'Right shoulder angle', 25, 45, 80, True,
        'Count the right arm moving out to the side and back down. Keep the hip, shoulder and elbow visible.'),
    'seated_march': definition('Seated marches', 'Rehabilitation demo', [(6, 12, 14)],
        'Right hip angle', 85, 75, 60, False,
        'Count right-knee lifts only. Use a side view with the shoulder, hip and knee visible.'),
    'sit_to_stand': definition('Sit-to-stand', 'Rehabilitation demo', [(12, 14, 16), (6, 12, 14)],
        'Minimum right hip/knee angle', 105, 125, 155, True,
        'Keep the right shoulder, hip, knee and ankle visible. Both hip and knee must extend; a leg extension alone is not a stand.'),
}


def catalog():
    return [dict(id=key, **deepcopy(value), criteria=criteria(value)) for key, value in EXERCISES.items()]


def criteria(spec):
    rest, start, full = (spec[key] for key in ('rest_angle', 'start_angle', 'full_angle'))
    if spec['increasing']:
        return f'Start/return at ≤{rest}°. Attempt begins at ≥{start}°. Demo range reached at ≥{full}°.'
    return f'Start/return at ≥{rest}°. Attempt begins at ≤{start}°. Demo range reached at ≤{full}°.'


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
    required = sorted({joint for group in spec['joints'] for joint in group})
    weak = []
    for joint in required:
        confidence = keypoints[joint * 3 + 2]
        if type(confidence) not in (int, float) or not MIN_CONFIDENCE <= confidence <= 1_000_000:
            weak.append(JOINT_NAMES[joint])
    if weak:
        return None, 'Low confidence in ' + ', '.join(weak)
    angles = [joint_angle(keypoints, group) for group in spec['joints']]
    if any(angle is None for angle in angles):
        return None, 'Joint geometry unavailable'
    return min(angles), 'Tracking'


def report(person, metrics, exercise_id):
    spec = EXERCISES[exercise_id]
    score = round(person.full * 100 / person.reps) if person.reps else None
    issues = []
    short = person.reps - person.full
    if short:
        issues.append(f'{short} attempt(s) did not reach the demo range target')
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
