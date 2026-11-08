# Fixed demonstration exercises

The initial catalog is in `backend/tracker/exercises.py`. These are team-chosen prototype thresholds for testing the software. They are not a personalized exercise prescription; CCCARE instructors will help tailor criteria later. There is no custom-angle editor.

Each rep requires a visible starting/rest pose, an excursion past the attempt threshold, and a return to rest. Angles are internal joint angles: a straight elbow or knee is approximately 180 degrees. All required joints must meet the confidence cutoff, currently 0.4. A lost joint clears an unfinished attempt; completed counts remain.

| Exercise | Measured joints | Starting/return angle | Attempt begins | Demo range |
| --- | --- | --- | --- | --- |
| Seated right-arm curl | Right shoulder–elbow–wrist | ≥150° | ≤120° | ≤70° |
| Pushups | Right shoulder–elbow–wrist | ≥150° | ≤120° | ≤90° |
| Squats | Right hip–knee–ankle | ≥160° | ≤130° | ≤100° |
| Seated knee extensions | Right hip–knee–ankle | ≤105° | ≥125° | ≥155° |
| Seated shoulder raises | Right hip–shoulder–elbow | ≤25° | ≥45° | ≥80° |
| Seated marches | Right shoulder–hip–knee | ≥85° | ≤75° | ≤60° |
| Sit-to-stand | Minimum of right hip and knee angles | ≤105° | ≥125° | ≥155° |

The current unilateral movements count the right side only, not alternating left/right reps. Use a suitable view of the required joints. Pushup feedback currently describes elbow range; it does not verify whole-body alignment. Squat feedback describes knee range. Sit-to-stand requires both hip and knee extension so an isolated seated knee extension cannot count as a stand.

The rehabilitation starter set includes chair-based knee extensions, marches, shoulder raises, and a functional sit-to-stand movement. It is not an exhaustive rehabilitation library. Examples of chair/functional movements are described in [UCLH's rehabilitation exercise guide](https://www.uclh.nhs.uk/patients-and-visitors/patient-information-pages/home-exercises-improve-strength-and-balance-following-hospital-admission), [NHS sitting exercises](https://www.nhs.uk/live-well/exercise/sitting-exercises/), and [North Tees balance exercises](https://www.nth.nhs.uk/resources/balance-exercises/). **The software's numeric thresholds are ours, not thresholds taken from those clinical guides.**

## Reports

- Dose progress counts completed attempts, including those below the range criterion.
- Range score is `full / reps * 100`, rounded to the nearest integer. With zero reps it is unknown, not zero.
- Each rep retains its unrounded peak angle and whether it met the criterion. Displayed angles are rounded; classification uses the original value.
- Tracking coverage is the percentage of submitted pose frames with usable required joints. It is not a form score or a time-based latency measurement.
- Tracking losses count transitions from usable to unusable tracking. Discarded attempts count only attempts that had visibly begun before tracking was lost. An unseen movement is not claimed as a measured missed rep.
- Review notes summarize range misses, incomplete attempts, target shortfall/overrun, and low tracking coverage.

The synthetic replay runs each exercise through the same measurement and counting logic, using generated COCO joints. The bundled checks verify full/short counts, independent participants, lost tracking, and persisted reports for all seven exercises. These checks do not establish live camera accuracy for the newly added movements; those need separate volunteer tests and manual labels.
