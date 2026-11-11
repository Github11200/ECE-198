"""Generate a self-contained, printable report from a saved workout."""
from html import escape


def workout_report(session):
    def text(value):
        return escape(str(value), quote=True)

    def percentage(value):
        return 'Not recorded' if value is None else f'{value}%'

    people = session['participants']
    reps = sum(person['reps'] for person in people)
    target = sum(person['target'] for person in people)
    full = sum(person['full'] for person in people)
    score = percentage(round(full * 100 / reps) if reps else None)
    criteria = session.get('criteria', {})
    rows, reviews = [], []
    for person in people:
        rows.append('<tr>' + ''.join(f'<td>{text(value)}</td>' for value in (
            person['id'], person.get('lane', '—'), f"{person['reps']} / {person['target']}",
            person['full'], person['short'], percentage(person.get('range_score')),
            percentage(person.get('tracking_coverage')))) + '</tr>')
        issues = person.get('issues') or ['The rep target and measured range criteria were met.']
        notes = ''.join(f'<li>{text(issue)}</li>' for issue in issues)
        details = ''.join('<tr>' + ''.join(f'<td>{text(value)}</td>' for value in (
            rep['number'], f"{rep['peak_angle']:.2f}°",
            'Range reached' if rep['reached_range'] else 'Below range target')) + '</tr>'
            for rep in person.get('rep_details', []))
        rep_table = ('<table><thead><tr><th>Rep</th><th>Observed peak angle</th><th>Range result</th></tr></thead>'
                     f'<tbody>{details}</tbody></table>') if details else '<p>Per-rep angles were not recorded in this session.</p>'
        reviews.append(f'<section><h2>{text(person["id"])} review</h2><ul>{notes}</ul>{rep_table}</section>')
    stamp = lambda value: f'<time data-utc="{text(value)}">{text(value)} (UTC)</time>'
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CCCARE workout report — {text(session['exercise_label'])}</title>
<style>
body{{font:15px/1.5 system-ui,sans-serif;color:#173a35;margin:32px auto;max-width:1050px;padding:0 22px}}
h1{{font-size:30px;line-height:1.15}}h2{{font-size:19px}}p{{margin:8px 0}}.muted{{color:#526b65}}
.totals{{display:flex;flex-wrap:wrap;gap:22px;padding:16px;background:#edf5f1;border-radius:8px;margin:20px 0}}
.totals strong{{display:block;font-size:24px}}table{{border-collapse:collapse;width:100%;margin:12px 0 24px}}
th,td{{text-align:left;padding:9px;border-bottom:1px solid #ceded7}}th{{background:#edf5f1}}
section{{margin-top:28px;break-inside:avoid}}button{{padding:10px 16px;background:#0d5d52;color:white;border:0;border-radius:7px}}
.table-wrap{{overflow-x:auto}}@media print{{body{{margin:0;max-width:none;font-size:11px}}button{{display:none}}h1{{font-size:24px}}}}
@page{{size:A4;margin:16mm}}
</style></head><body>
<button type="button" onclick="window.print()">Print / save as PDF</button>
<h1>CCCARE workout report</h1>
<p><strong>{text(session['exercise_label'])} · {text(session['station'])}</strong></p>
<p class="muted">Source: {text(session['source'])} · Participants: {len(people)} · Session {text(session['id'])}</p>
<p>Started: {stamp(session['started_at'])}<br>Finished: {stamp(session['finished_at'])}</p>
<div class="totals"><div>Completed / prescribed<strong>{reps} / {target}</strong></div>
<div>Range target reached<strong>{full} attempts</strong></div><div>Range score<strong>{score}</strong></div></div>
<p><strong>Fixed criteria:</strong> {text(criteria.get('description', 'Not recorded'))}</p>
<p class="muted">Range score is the percentage of completed attempts that reached the configured angle target.
It is separate from dose completion and tracking coverage. Review notes describe measured observations.</p>
<div class="table-wrap"><table><thead><tr><th>Participant</th><th>Lane</th><th>Reps / target</th><th>Full</th><th>Short</th>
<th>Range score</th><th>Tracking coverage</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
{''.join(reviews)}
<script>
for (const stamp of document.querySelectorAll('time[data-utc]')) {{
  const date = new Date(stamp.dataset.utc);
  if (!Number.isNaN(date.getTime())) stamp.textContent = new Intl.DateTimeFormat('en-CA', {{
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Toronto'
  }}).format(date) + ' (America/Toronto)';
}}
</script></body></html>'''
