"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronRight, CircleAlert, ClipboardCheck, Play, Plus, Search, UsersRound } from "lucide-react";
import PortalShell from "./portal-shell";
import Modal from "./modal";
import { useTracker } from "@/lib/use-tracker";
import { percent, sourceNames, totalRangeScore, workoutDate, type ParticipantResult, type Source, type Workout } from "@/lib/tracker-api";

const defaultIds = ["P01", "P02", "P03", "P04", "P05"];
type Lane = { id: string; target: number };

function ResultNotes({ person }: { person: ParticipantResult }) {
  return <>
    {person.issues.length ? <ul className="tracker-notes">{person.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
      : <p className="tracker-hint">Rep target and measured range criteria met.</p>}
    <details className="tracker-rep-details">
      <summary>Per-rep angles ({person.rep_details.length})</summary>
      {person.rep_details.length ? <div className="table-scroll"><table>
        <thead><tr><th>Rep</th><th>Peak angle</th><th>Range</th></tr></thead>
        <tbody>{person.rep_details.map(rep => <tr key={rep.number}><td>{rep.number}</td><td>{rep.peak_angle.toFixed(2)}°</td><td>{rep.reached_range ? "Reached" : "Short"}</td></tr>)}</tbody>
      </table></div> : <p className="tracker-hint">Per-rep angles were not recorded.</p>}
    </details>
  </>;
}

function WorkoutDetails({ workout }: { workout: Workout }) {
  const reps = workout.participants.reduce((sum, p) => sum + p.reps, 0);
  const target = workout.participants.reduce((sum, p) => sum + p.target, 0);
  return <>
    <h3 className="summary-title tracker-summary-title">{workout.exercise_label} · {workout.station}</h3>
    <p className="summary-date">{workoutDate(workout.finished_at || workout.started_at)} · {sourceNames[workout.source]}</p>
    <div className="summary-stats">
      <div><strong>{reps} / {target}</strong><span>Completed / prescribed reps</span></div>
      <div><strong>{percent(totalRangeScore(workout))}</strong><span>Range score</span></div>
    </div>
    <p className="tracker-hint">{workout.criteria.description}</p>
    <div className="table-scroll"><table className="tracker-result-table">
      <thead><tr><th>Participant / lane</th><th>Reps / target</th><th>Full / short</th><th>Range score</th><th>Tracking coverage</th></tr></thead>
      <tbody>{workout.participants.map(p => <tr key={p.id}>
        <td><strong>{p.id}</strong><small>Lane {p.lane}</small></td><td>{p.reps} / {p.target}</td>
        <td>{p.full} / {p.short}</td><td>{percent(p.range_score)}</td><td>{percent(p.tracking_coverage)}</td>
      </tr>)}</tbody>
    </table></div>
    {workout.participants.map(p => <details className="tracker-person-review" key={p.id}>
      <summary>{p.id} review · {p.issues.length ? `${p.issues.length} note(s)` : "Range and dose met"}</summary>
      <p className="tracker-hint">Tracking losses: {p.tracking_losses ?? "Not recorded"} · Discarded attempts: {p.discarded_attempts ?? "Not recorded"}</p>
      <ResultNotes person={p} />
    </details>)}
    <p className="tracker-hint">Range score measures completed attempts reaching the fixed angle target. Dose completion and tracking coverage are separate measurements.</p>
    <div className="modal-actions">
      <a className="button" href={`/reports/${workout.id}`} target="_blank" rel="noopener">Open workout report / print <ArrowRight size={16} /></a>
    </div>
  </>;
}

export default function AdminPortal({ view = "overview" }: { view?: "overview" | "participants" | "sessions" }) {
  const tracker = useTracker();
  const { active, history, exercises, busy, connected, loading } = tracker;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState(10);
  const [nextTargets, setNextTargets] = useState<Record<string, number>>({});
  const [preparing, setPreparing] = useState(false);
  const [lanes, setLanes] = useState<Lane[]>(defaultIds.slice(0, 3).map(id => ({ id, target: 10 })));
  const [exerciseId, setExerciseId] = useState("squat");
  const [station, setStation] = useState("Station 1");
  const [source, setSource] = useState<Source>("camera");
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [previewId, setPreviewId] = useState("P01");
  const [saved, setSaved] = useState<Workout | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const ids = [...new Set([...defaultIds, ...history.flatMap(s => s.participants.map(p => p.id)), ...(active?.participants.map(p => p.id) || [])])].sort();
  const people = ids.map(id => {
    const current = active?.participants.find(p => p.id === id);
    const previous = history.find(s => s.participants.some(p => p.id === id));
    const result = current || previous?.participants.find(p => p.id === id);
    return { id, result, workout: current ? active : previous, live: Boolean(current), visits: history.filter(s => s.participants.some(p => p.id === id)).length };
  });
  const needsReview = (p: (typeof people)[number]) => Boolean(p.result && (p.live ? p.result.angle == null || p.result.short > 0 : p.result.issues.length > 0));
  const filtered = people.filter(p => `${p.id} Participant ${p.id.slice(1)}`.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || needsReview(p)));
  const selected = people.find(p => p.id === selectedId);
  const exercise = exercises.find(e => e.id === exerciseId);
  const visibleHistory = history.filter(s => !historyFilter || s.participants.some(p => p.id === historyFilter));
  const preview = active?.participants.find(p => p.id === previewId) || active?.participants[0];
  const error = actionError || tracker.error;

  function prepare() {
    setActionError("");
    if (active) { setMonitorOpen(true); return; }
    setPreparing(true);
  }

  function setLaneCount(count: number) {
    setLanes(current => Array.from({ length: count }, (_, i) => current[i] || { id: defaultIds[i], target: nextTargets[defaultIds[i]] ?? 10 }));
  }

  async function beginSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !connected) return;
    setActionError("");
    if (new Set(lanes.map(p => p.id)).size !== lanes.length) { setActionError("Assign a different participant ID to each lane."); return; }
    try {
      const result = await tracker.start({ source, exercise: exerciseId, station, participant_ids: lanes.map(p => p.id), targets: lanes.map(p => p.target) });
      setPreviewId(result.participants[0].id);
      setPreparing(false);
      setMonitorOpen(true);
      setNotice(`${result.exercise_label} session started for ${result.participants.length} participants.`);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not start the session."); }
  }

  async function finishSession() {
    if (!active || busy || !connected) return;
    setActionError("");
    try {
      const result = await tracker.finish(active.id);
      setMonitorOpen(false);
      setSaved(result);
      setNotice("Session saved. Your workout report and participant results are available in Session history.");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not save the session. Retry End & save."); }
  }

  return <PortalShell role="admin">
    <div className="portal-page-heading">
      <div><p className="section-kicker">ALDER REHABILITATION · INSTRUCTOR WORKSPACE</p>
        <h1>{view === "participants" ? "Your participants." : view === "sessions" ? "A record of every step." : "Your group, in view."}</h1>
        <p>{view === "sessions" ? "Review completed workouts and participant reports." : "Set individual targets and follow each participant’s exercise progress."}</p>
      </div>
      <button className="button" onClick={prepare} disabled={loading || busy || !connected || !exercises.length}>{active ? <Play size={17} /> : <Plus size={17} />}{active ? "View live session" : "Prepare a session"}</button>
    </div>
    {error && <div className="inline-notice tracker-error" role="alert"><CircleAlert size={18} />{error}</div>}
    {!connected && <p className="tracker-hint" role="status">{loading ? "Connecting to the tracker…" : "Reconnecting to the tracker. Displayed results may be out of date."}</p>}
    {notice && <div className="inline-notice" role="status"><Check size={18} />{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    {active && <div className="upcoming-session surface tracker-active-banner">
      <span className="calendar-tile"><Play size={24} /></span>
      <div><p className="section-kicker">ACTIVE SESSION</p><h2>{active.exercise_label} · {active.station}</h2><p>{active.participants.length} participants · {sourceNames[active.source]}</p></div>
      <button className="text-link" onClick={() => setMonitorOpen(true)}>Open monitor <ArrowRight size={17} /></button>
    </div>}

    {view !== "sessions" && <>
      <div className="portal-stats admin-stats">
        <article><span className="stat-label">Participant IDs <UsersRound size={18} /></span><strong>{loading ? "—" : people.length}<small> in roster</small></strong><p>Assign IDs to camera lanes before starting</p></article>
        <article><span className="stat-label">Completed sessions <ClipboardCheck size={18} /></span><strong>{loading ? "—" : history.length}<small> recent sessions</small></strong><p>Saved workout reports</p></article>
        <article><span className="stat-label">Review measurements <CircleAlert size={18} /></span><strong>{loading ? "—" : people.filter(needsReview).length}<small> participants</small></strong><p>Range, dose, or tracking notes</p></article>
      </div>
      <section className="surface roster-table">
        <div className="card-heading"><div><h2>{view === "participants" ? "Participant directory" : "Your participants"}</h2><p>Current session or most recent saved results</p></div><span className="pill pill-neutral">Numbered IDs</span></div>
        <div className="table-toolbar">
          <label className="search-field"><Search size={17} /><span className="sr-only">Search participants</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participant ID" /></label>
          <label><span className="sr-only">Filter participants</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All participants</option><option value="review">Needs review</option></select></label>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Participant</th><th>Exercise</th><th>Reps / target</th><th>Range score</th><th>Status</th><th><span className="sr-only">View participant</span></th></tr></thead>
          <tbody>{filtered.map(p => <tr key={p.id}>
            <td><button className="participant-name" onClick={() => { setSelectedId(p.id); setEditTarget(nextTargets[p.id] ?? 10); }}><span className="avatar mint">{p.id.slice(1)}</span><span><strong>Participant {p.id.slice(1)}</strong><small>{p.id}{p.live ? ` · lane ${p.result?.lane}` : ""}</small></span></button></td>
            <td>{p.workout?.exercise_label || "No session yet"}{p.workout && <small>{p.live ? "Live" : workoutDate(p.workout.finished_at!)} · {sourceNames[p.workout.source]}</small>}</td>
            <td>{p.result ? <div className="rep-cell"><span><strong>{p.result.reps}</strong> / {p.result.target}</span><progress value={p.result.reps} max={p.result.target} aria-label={`${p.id} rep progress`} /></div> : "—"}</td>
            <td>{percent(p.result?.range_score)}</td>
            <td><span className={`pill ${needsReview(p) ? "pill-amber" : "pill-neutral"}`}>{p.live ? p.result?.angle == null ? "No clear view" : "Tracking" : p.result ? needsReview(p) ? "Review notes" : "Target met" : "Ready for setup"}</span></td>
            <td><button className="icon-button" aria-label={`View ${p.id}`} onClick={() => { setSelectedId(p.id); setEditTarget(nextTargets[p.id] ?? 10); }}><ChevronRight size={18} /></button></td>
          </tr>)}</tbody></table>
          {!filtered.length && <div className="empty-state"><Search size={24} /><h3>No participants match this search.</h3><button className="text-link" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters <ArrowRight size={15} /></button></div>}
        </div><div className="table-footer">Showing {filtered.length} of {people.length} IDs<span>IDs stay with participants across sessions</span></div>
      </section>
    </>}

    {view === "sessions" && <section className="surface session-table">
      <div className="card-heading"><div><h2>Completed group sessions</h2><p>Actual saved results, including synthetic replays labeled by source.</p></div><label className="tracker-filter">Participant<select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}><option value="">All participants</option>{ids.map(id => <option key={id}>{id}</option>)}</select></label></div>
      <div className="table-scroll"><table><thead><tr><th>Exercise / station</th><th>Finished</th><th>Participants</th><th>Reps / target</th><th>Range score</th><th>Report</th></tr></thead>
        <tbody>{visibleHistory.map(s => <tr key={s.id}>
          <td><strong>{s.exercise_label}</strong><small>{s.station} · {sourceNames[s.source]}</small></td><td>{workoutDate(s.finished_at!)}</td><td>{s.participants.length}</td>
          <td>{s.participants.reduce((sum, p) => sum + p.reps, 0)} / {s.participants.reduce((sum, p) => sum + p.target, 0)}</td><td>{percent(totalRangeScore(s))}</td><td><button className="text-link" onClick={() => setSaved(s)}>View summary <ChevronRight size={15} /></button></td>
        </tr>)}</tbody></table></div>
      {!visibleHistory.length && <div className="empty-state"><ClipboardCheck size={24} /><h3>{loading ? "Loading saved sessions…" : "No completed sessions yet."}</h3><p>End and save a workout to generate its report.</p></div>}
    </section>}
    <p className="workspace-note">CCCARE Exercise Tracker · {connected ? "Connected to local tracker" : "Waiting for connection"} · Up to five lanes per active session</p>

    {selected && <Modal title="Participant details" onClose={() => setSelectedId(null)}>
      <div className="participant-detail-heading"><span className="avatar avatar-large mint">{selected.id.slice(1)}</span><div><h3>Participant {selected.id.slice(1)}</h3><p>{selected.id}{selected.live ? ` · lane ${selected.result?.lane}` : ""}</p></div></div>
      <dl className="detail-grid"><div><dt>Completed sessions in recent history</dt><dd>{selected.visits}</dd></div><div><dt>Latest exercise</dt><dd>{selected.workout?.exercise_label || "Not recorded"}</dd></div><div><dt>Reps / target</dt><dd>{selected.result ? `${selected.result.reps} / ${selected.result.target}` : "Not recorded"}</dd></div><div><dt>Range score</dt><dd>{percent(selected.result?.range_score)}</dd></div></dl>
      {selected.result && <div className="instructor-note-box"><h3>Measurement notes</h3><ResultNotes person={selected.result} /></div>}
      <form onSubmit={e => { e.preventDefault(); setNextTargets(current => ({ ...current, [selected.id]: editTarget })); setLanes(current => current.map(lane => lane.id === selected.id ? { ...lane, target: editTarget } : lane)); setSelectedId(null); setNotice(`${selected.id} next session target set to ${editTarget}.`); }}>
        <label className="target-edit">Next session rep target<input type="number" min="1" max="99" step="1" required value={Number.isNaN(editTarget) ? "" : editTarget} onChange={e => setEditTarget(e.target.valueAsNumber)} /></label>
        <p className="tracker-hint">Applies to the next setup on this page. Starting a session saves its target snapshot.</p>
        <div className="modal-actions"><button className="button" type="submit">Use target <Check size={16} /></button></div>
      </form>
    </Modal>}

    {preparing && <Modal title="Prepare a group session" onClose={() => { if (!busy) setPreparing(false); }} wide>
      <form onSubmit={beginSession}>
        <p className="modal-intro">Assign a participant ID to each lane, from left to right. Each person stays in that lane while the session runs.</p>
        {error && <p className="tracker-error" role="alert">{error}</p>}
        {active && <p className="tracker-error" role="alert">Another session is active. Close setup and open its monitor to finish it first.</p>}
        <fieldset className="tracker-fields" disabled={busy || !connected || Boolean(active)}>
          <label>Station<input value={station} onChange={e => setStation(e.target.value)} maxLength={60} required /></label>
          <label>Exercise<select value={exerciseId} onChange={e => setExerciseId(e.target.value)}>{exercises.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
          <label>Pose input<select value={source} onChange={e => setSource(e.target.value as Source)}>{Object.entries(sourceNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Participants<select value={lanes.length} onChange={e => setLaneCount(Number(e.target.value))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
        </fieldset>
        <p className="tracker-hint">{exercise?.help}</p><p className="tracker-hint">Fixed demo angles: {exercise?.criteria}</p>
        <p className="tracker-hint">{source === "camera" ? "Start the session, then run the AlphaPose camera bridge on this laptop. Its preview opens in a separate window." : source === "replay" ? "Generated joint coordinates run through the backend scorer for five seconds. No camera required." : "Start the session, then send your saved AlphaPose COCO JSON using the recording bridge."}</p>
        <div className="tracker-lane-grid">{lanes.map((lane, i) => <fieldset className="tracker-lane" key={i} disabled={busy || !connected || Boolean(active)}>
          <legend>Camera lane {i + 1}</legend>
          <label>Participant ID<input aria-label={`Lane ${i+1} participant ID`} value={lane.id} pattern="P(?:0[1-9]|[1-9][0-9])" maxLength={3} required onChange={e => setLanes(current => current.map((p,j) => j === i ? { ...p, id: e.target.value.toUpperCase() } : p))} /></label>
          <label>Rep target<input aria-label={`Lane ${i+1} rep target`} type="number" min="1" max="99" step="1" required value={Number.isNaN(lane.target) ? "" : lane.target} onChange={e => setLanes(current => current.map((p,j) => j === i ? { ...p, target: e.target.valueAsNumber } : p))} /></label>
        </fieldset>)}</div>
        <p className="tracker-hint">IDs P01–P99 are assigned manually. The camera does not recognize identities.</p>
        <div className="modal-actions"><button type="submit" className="button" disabled={busy || !connected || !exercise || Boolean(active)}><Play size={16} />{busy ? "Starting…" : source === "replay" ? "Start demo replay" : "Start session"}</button></div>
      </form>
    </Modal>}

    {active && monitorOpen && <Modal title={`${active.exercise_label} · ${active.station}`} onClose={() => setMonitorOpen(false)} wide>
      {error && <p className="tracker-error" role="alert">{error}</p>}
      <p className="modal-intro">{active.criteria.description}<br /><span>{sourceNames[active.source]} · {active.participants.filter(p => p.angle != null).length} of {active.participants.length} lanes have a usable pose.</span></p>
      {active.replay_done && <p className="inline-notice">Replay complete. End & save to generate the report.</p>}
      <div className="demo-session-layout">
        {preview && <div className="demo-pose-view tracker-feedback" aria-label="Participant feedback">
          <span className="pill pill-neutral">{preview.id} · Lane {preview.lane}</span>
          <strong className="tracker-angle">{preview.angle == null ? "—" : `${preview.angle}°`}</strong>
          <p>{active.criteria.angle_label}{preview.angle == null ? " unavailable" : ""}</p>
          <strong className="tracker-feedback-reps">{preview.reps} / {preview.target} reps</strong>
          <p>{preview.cue}</p><span>{preview.tracking_reason}</span>
          <span>Range score: {percent(preview.range_score)}</span>
        </div>}
        <div className="tracker-live-roster">{active.participants.map(p => <button type="button" key={p.id} className={`tracker-live-person ${p.id === preview?.id ? "selected" : ""}`} aria-pressed={p.id === preview?.id} onClick={() => setPreviewId(p.id)}>
          <span className="avatar mint">{p.lane}</span><span className="tracker-live-person-info"><strong>{p.id} · Participant {p.id.slice(1)}</strong><progress value={p.reps} max={p.target} aria-label={`${p.id} rep progress`} /><small>{p.angle == null ? p.tracking_reason : p.cue}</small><small>{p.last_range || "No completed attempt yet"}</small></span><strong>{p.reps}<small>/ {p.target}</small></strong>
        </button>)}</div>
      </div>
      <p className="tracker-hint">Counts are independent. Targets do not end the session automatically. Closing this monitor keeps the session running.</p>
      <div className="modal-actions"><button className="button button-outline" onClick={() => setMonitorOpen(false)}>Close monitor</button><button className="button" disabled={busy || !connected} onClick={() => void finishSession()}><Check size={16} />{busy ? "Saving…" : "End & save session"}</button></div>
    </Modal>}

    {saved && <Modal title="Session summary" onClose={() => setSaved(null)} wide><WorkoutDetails workout={saved} /></Modal>}
  </PortalShell>;
}
