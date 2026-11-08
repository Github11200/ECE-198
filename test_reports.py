import unittest
from reports import workout_report


class ReportTests(unittest.TestCase):
    def test_three_person_squat_report_uses_actual_counts_and_escapes_labels(self):
        people = [dict(id=f'P{i:02}', lane=i, target=10, reps=reps, full=full,
                       short=reps-full, range_score=round(full*100/reps), tracking_coverage=95,
                       issues=['1 attempt below range'],
                       rep_details=[dict(number=1, peak_angle=110, reached_range=False)])
                  for i, reps, full in ((1, 10, 8), (2, 9, 9), (3, 10, 7))]
        html = workout_report(dict(id='a'*32, exercise_label='Squats', station='<script>bad()</script>',
                                   source='camera', started_at='2026-11-07T17:00:00+00:00',
                                   finished_at='2026-11-07T17:05:00+00:00', participants=people,
                                   criteria={'description': 'Range ≤100°'}))
        self.assertIn('29 / 30', html)
        self.assertIn('24 attempts', html)
        self.assertIn('83%', html)
        self.assertIn('P03 review', html)
        self.assertIn('110.00°', html)
        self.assertIn('&lt;script&gt;bad()', html)
        self.assertNotIn('<script>bad()', html)
        self.assertIn('America/Toronto', html)
