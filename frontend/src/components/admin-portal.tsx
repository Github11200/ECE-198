"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Pause,
  Play,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import PortalShell from "./portal-shell";
import Modal from "./modal";
import ExerciseIllustration from "./exercise-illustration";
import {
  groupSessions,
  participants as initialParticipants,
  type Participant,
} from "@/lib/demo-data";

type SavedSession = (typeof groupSessions)[number];
type ActiveSession = {
  people: Participant[];
  counts: number[];
  paused: boolean;
};

export default function AdminPortal({
  view = "overview",
}: {
  view?: "overview" | "participants" | "sessions";
}) {
  const [people, setPeople] = useState(initialParticipants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [editTarget, setEditTarget] = useState(10);
  const [preparing, setPreparing] = useState(false);
  const [included, setIncluded] = useState(
    initialParticipants.map((p) => p.id),
  );
  const [running, setRunning] = useState<ActiveSession | null>(null);
  const [monitorOpen, setMonitorOpen] = useState(true);
  const [history, setHistory] = useState<SavedSession[]>(groupSessions);
  const [saved, setSaved] = useState<SavedSession | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem("cccare-demo-sessions") || "null",
      );
      if (
        Array.isArray(stored) &&
        stored.every(
          (s) => typeof s.id === "string" && typeof s.reps === "number",
        )
      )
        setHistory([...stored, ...groupSessions]);
    } catch {
      /* A fresh demo uses the prepared records. */
    }
  }, []);

  useEffect(() => {
    if (!running || running.paused) return;
    const timer = window.setInterval(
      () =>
        setRunning((current) =>
          current
            ? {
                ...current,
                counts: current.counts.map((value, i) =>
                  Math.min(value + 1, current.people[i].target),
                ),
              }
            : current,
        ),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [running?.paused, Boolean(running)]);

  const filtered = people.filter(
    (p) =>
      `${p.name} ${p.id}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || p.status === "Check in"),
  );

  function beginSession() {
    const roster = people.filter((p) => included.includes(p.id));
    setRunning({ people: roster, counts: roster.map(() => 0), paused: false });
    setMonitorOpen(true);
    setPreparing(false);
  }

  function finishSession() {
    if (!running) return;
    const result: SavedSession = {
      id: `DEMO-${Date.now()}`,
      date: "11 November 2026",
      time: "10:30 AM",
      name: "Morning movement",
      count: running.people.length,
      reps: running.counts.reduce((a, b) => a + b, 0),
      status: "Completed",
    };
    const next = [result, ...history];
    setHistory(next);
    try {
      sessionStorage.setItem(
        "cccare-demo-sessions",
        JSON.stringify(next.filter((s) => s.id.startsWith("DEMO-"))),
      );
    } catch {
      /* The current page still retains the result. */
    }
    setRunning(null);
    setSaved(result);
    setNotice("Demo session saved. You can review it in Session history.");
  }

  return (
    <PortalShell role="admin">
      <div className="portal-page-heading">
        <div>
          <p className="section-kicker">
            ALDER REHABILITATION · INSTRUCTOR WORKSPACE
          </p>
          <h1>
            {view === "participants"
              ? "Your participants."
              : view === "sessions"
                ? "A record of every step."
                : "Welcome back, Emma."}
          </h1>
          <p>
            {view === "participants"
              ? "Individual plans, rep targets, and the people behind them."
              : view === "sessions"
                ? "Review group sessions and exercise summaries."
                : "A clear view of your group, so you can focus on their care."}
          </p>
        </div>
        <button className="button" onClick={() => setPreparing(true)}>
          <Plus size={17} /> Prepare a session
        </button>
      </div>
      {notice && (
        <div className="inline-notice" role="status">
          <Check size={18} />
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}
      {running && !monitorOpen && (
        <div className="inline-notice" role="status">
          <Pause size={17} />
          Your demo session is paused.
          <button onClick={() => setMonitorOpen(true)}>
            Return to session
          </button>
        </div>
      )}

      {view !== "sessions" && (
        <>
          <div className="portal-stats admin-stats">
            <article>
              <span className="stat-label">
                Active participants <UsersRound size={18} />
              </span>
              <strong>
                {people.length} <small>participants</small>
              </strong>
              <p>Morning movement group</p>
            </article>
            <article>
              <span className="stat-label">
                Completed sessions <ClipboardCheck size={18} />
              </span>
              <strong>
                {history.length} <small>sessions</small>
              </strong>
              <p>Available in session history</p>
            </article>
            <article>
              <span className="stat-label">
                A little extra support <CircleAlert size={18} />
              </span>
              <strong>
                {people.filter((p) => p.status === "Check in").length}{" "}
                <small>check-in requested</small>
              </strong>
              <p>Before the next group session</p>
            </article>
          </div>
          {view === "overview" && (
            <div className="upcoming-session surface">
              <span className="calendar-tile">
                <small>NOV</small>
                <strong>11</strong>
              </span>
              <div>
                <p className="section-kicker">YOUR NEXT GROUP SESSION</p>
                <h2>Morning movement</h2>
                <p>
                  Wednesday · 10:30–11:15 AM <span>Rehabilitation studio</span>
                </p>
              </div>
              <div className="upcoming-roster">
                <div className="avatar-stack">
                  {people.slice(0, 4).map((p) => (
                    <span className={`avatar ${p.colour}`} key={p.id}>
                      {p.initials}
                    </span>
                  ))}
                </div>
                <span>{people.length} participants</span>
              </div>
              <button className="text-link" onClick={() => setPreparing(true)}>
                Review session <ArrowRight size={17} />
              </button>
            </div>
          )}

          <section className="surface roster-table">
            <div className="card-heading">
              <div>
                <h2>
                  {view === "participants"
                    ? "Participant directory"
                    : "Your participants"}
                </h2>
                <p>Latest seated arm curl results and current rep targets</p>
              </div>
              <span className="pill pill-neutral">Morning movement</span>
            </div>
            <div className="table-toolbar">
              <label className="search-field">
                <Search size={17} />
                <span className="sr-only">Search participants</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or participant ID"
                />
              </label>
              <label>
                <span className="sr-only">Filter participants</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All participants</option>
                  <option value="check">Check-in requested</option>
                </select>
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Programme</th>
                    <th>Latest reps / target</th>
                    <th>Last session</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">View participant</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button
                          className="participant-name"
                          onClick={() => {
                            setSelected(p);
                            setEditTarget(p.target);
                          }}
                        >
                          <span className={`avatar ${p.colour}`}>
                            {p.initials}
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.id}</small>
                          </span>
                        </button>
                      </td>
                      <td>{p.stage}</td>
                      <td>
                        <div className="rep-cell">
                          <span>
                            <strong>{p.completed}</strong> / {p.target}
                          </span>
                          <progress
                            max={p.target}
                            value={p.completed}
                            aria-label={`${p.name}: ${p.completed} of ${p.target} reps`}
                          />
                        </div>
                      </td>
                      <td>{p.lastSession}</td>
                      <td>
                        <span
                          className={`pill ${p.status === "Check in" ? "pill-amber" : "pill-positive"}`}
                        >
                          <i />
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`View ${p.name}`}
                          onClick={() => {
                            setSelected(p);
                            setEditTarget(p.target);
                          }}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={24} />
                  <h3>No participants match this search.</h3>
                  <p>Try another name or change the status filter.</p>
                  <button
                    className="text-link"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Clear filters <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
            <div className="table-footer">
              Showing {filtered.length} of {people.length} participants
              <span>Individual goals. Shared support.</span>
            </div>
          </section>
        </>
      )}

      {view === "sessions" && (
        <section className="surface session-table">
          <div className="card-heading">
            <div>
              <h2>Completed group sessions</h2>
              <p>Select a session to view its summary.</p>
            </div>
            <span className="pill pill-neutral">{history.length} sessions</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Participants</th>
                  <th>Total reps</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">View summary</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>
                        {s.id.startsWith("DEMO") ? "Demo session" : s.id}
                      </small>
                    </td>
                    <td>
                      {s.date}
                      <small>{s.time}</small>
                    </td>
                    <td>{s.count}</td>
                    <td>{s.reps}</td>
                    <td>
                      <span className="pill pill-positive">
                        <Check size={12} />
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button className="text-link" onClick={() => setSaved(s)}>
                        View summary <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="workspace-note">
        CCCARE Exercise Tracker <span>·</span> Prepared demonstration data.
        Changes stay in this browser tab.
      </p>

      {selected && (
        <Modal title="Participant details" onClose={() => setSelected(null)}>
          <div className="participant-detail-heading">
            <span className={`avatar avatar-large ${selected.colour}`}>
              {selected.initials}
            </span>
            <div>
              <h3>{selected.name}</h3>
              <p>
                {selected.id} · {selected.stage}
              </p>
            </div>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Programme</dt>
              <dd>Rehabilitation & exercise</dd>
            </div>
            <div>
              <dt>Sessions attended</dt>
              <dd>{selected.attendance}</dd>
            </div>
            <div>
              <dt>Latest curl result</dt>
              <dd>
                {selected.completed} / {selected.target} reps
              </dd>
            </div>
            <div>
              <dt>Last appointment</dt>
              <dd>{selected.lastSession}</dd>
            </div>
          </dl>
          <div className="instructor-note-box">
            <h3>Instructor note</h3>
            <p>{selected.note}</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPeople((current) =>
                current.map((p) =>
                  p.id === selected.id ? { ...p, target: editTarget } : p,
                ),
              );
              setNotice(
                `Updated ${selected.name}’s demo rep target to ${editTarget}.`,
              );
              setSelected(null);
            }}
          >
            <label className="target-edit">
              Seated arm curl target{" "}
              <input
                type="number"
                min="1"
                max="99"
                required
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.valueAsNumber)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="button" type="submit">
                Update target <Check size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {preparing && (
        <Modal
          title="Prepare a group session"
          onClose={() => setPreparing(false)}
        >
          <p className="modal-intro">
            Morning movement · Seated arm curl
            <br />
            <span>
              This session uses simulated rep updates for the demonstration.
            </span>
          </p>
          <div className="setup-roster">
            {people.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={included.includes(p.id)}
                  onChange={(e) =>
                    setIncluded((current) =>
                      e.target.checked
                        ? [...current, p.id]
                        : current.filter((id) => id !== p.id),
                    )
                  }
                />
                <span className={`avatar ${p.colour}`}>{p.initials}</span>
                <strong>{p.name}</strong>
                <span>{p.target} rep target</span>
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <span className="muted">
              {included.length} participants selected
            </span>
            <button
              className="button"
              disabled={!included.length || Boolean(running)}
              onClick={beginSession}
            >
              <Play size={16} /> Start demo session
            </button>
          </div>
        </Modal>
      )}

      {running && monitorOpen && (
        <Modal
          title="Morning movement · Demo session"
          onClose={() => {
            setRunning((current) =>
              current ? { ...current, paused: true } : current,
            );
            setMonitorOpen(false);
          }}
          wide
        >
          <div className="demo-session-layout">
            <div className="demo-pose-view">
              <span className="pill pill-neutral">Simulated pose input</span>
              <ExerciseIllustration type="curl" />
              <p>Seated arm curl</p>
              <span>Prepared demonstration · No camera connected</span>
            </div>
            <div className="demo-live-roster">
              {running.people.map((p, i) => (
                <div key={p.id}>
                  <span className={`avatar ${p.colour}`}>{p.initials}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <progress
                      value={running.counts[i]}
                      max={p.target}
                      aria-label={`${p.name} demo rep progress`}
                    />
                  </div>
                  <strong>
                    {running.counts[i]} <span>/ {p.target}</span>
                  </strong>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="button button-outline"
              onClick={() =>
                setRunning((current) =>
                  current ? { ...current, paused: !current.paused } : current,
                )
              }
            >
              {running.paused ? <Play size={16} /> : <Pause size={16} />}
              {running.paused ? "Resume" : "Pause"}
            </button>
            <button className="button" onClick={finishSession}>
              End & save demo <Check size={16} />
            </button>
          </div>
        </Modal>
      )}

      {saved && (
        <Modal title="Session summary" onClose={() => setSaved(null)}>
          <div className="summary-check">
            <Check size={24} />
          </div>
          <h3 className="summary-title">Morning movement, completed.</h3>
          <p className="summary-date">
            {saved.date} · {saved.time}
          </p>
          <div className="summary-stats">
            <div>
              <strong>{saved.count}</strong>
              <span>Participants</span>
            </div>
            <div>
              <strong>{saved.reps}</strong>
              <span>Completed reps</span>
            </div>
          </div>
          <p className="summary-exercise">Exercise recorded: Seated arm curl</p>
          <div className="modal-actions">
            <button className="button" onClick={() => setSaved(null)}>
              Back to workspace <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </PortalShell>
  );
}
