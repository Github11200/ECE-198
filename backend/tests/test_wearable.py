import unittest

from backend.wearable.publish_feedback import DISPLAY_TEXT, participant_feedback, wearable_snapshot, publisher_payload


class WearableContractTests(unittest.TestCase):
    def person(self):
        return dict(id='P01', reps=2, target=8, cue='Full range on last rep', angle=165,
                    last_range='Full range', full=2)

    def test_codes_have_short_display_text_and_preserve_dashboard_cue(self):
        cases = [({'angle': None}, 'TRACKING_LOST'),
                 ({'last_range': 'Short range', 'reps': 8}, 'CHECK_RANGE'),
                 ({'reps': 9}, 'ABOVE_TARGET'), ({'reps': 8}, 'TARGET_REACHED'),
                 ({}, 'RANGE_OK'), ({'last_range': None, 'reps': 0}, 'READY')]
        for changes, code in cases:
            person = self.person()
            person.update(changes)
            result = participant_feedback(person)
            self.assertEqual(result['cue_code'], code)
            self.assertEqual(result['cue'], person['cue'])
            self.assertEqual(result['display_text'], DISPLAY_TEXT[code])
            self.assertLessEqual(len(result['display_text']), 16)
            self.assertEqual(result['angle'], person['angle'])

    def test_range_score_is_completed_range_fraction_and_unknown_before_reps(self):
        person = self.person()
        person.update(reps=10, full=8)
        self.assertEqual(participant_feedback(person)['range_score'], 80)
        person.update(reps=0, full=0)
        self.assertIsNone(participant_feedback(person)['range_score'])

    def test_finish_sends_inactive_and_active_snapshot_keeps_participant_id(self):
        self.assertEqual(wearable_snapshot(None), {'session': None})
        person = self.person()
        person['id'] = 'P27'
        result = wearable_snapshot(dict(id='demo', source='camera', exercise='squat',
                                       station='Station B', last_frame=42, participants=[person]))
        self.assertEqual(result['session']['exercise'], 'squat')
        self.assertEqual(result['session']['frame'], 42)
        self.assertEqual(result['session']['participants'][0]['id'], 'P27')
        self.assertEqual(result['session']['participants'][0]['angle'], 165)


class DashboardRelayTests(unittest.TestCase):
    def test_full_dashboard_and_compact_feedback_share_session_and_clear_together(self):
        from backend.tracker.server import Session
        session = Session('replay', [8]).snapshot()
        payload = publisher_payload(session)
        self.assertEqual(payload['dashboard'], session)
        self.assertEqual(payload['session']['id'], session['id'])
        self.assertEqual(payload['session']['participants'][0]['reps'],
                         session['participants'][0]['reps'])
        self.assertIn('criteria', payload['dashboard'])
        self.assertEqual(publisher_payload(None), {'session': None, 'dashboard': None})
