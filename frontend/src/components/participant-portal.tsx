"use client";

import { useState } from "react";
import PortalShell from "./portal-shell";
import { useCloudHistory } from "@/lib/use-cloud-history";
import { useLiveFeedback } from "@/lib/live-feedback";
import { percent, workoutDate } from "@/lib/tracker-api";
import { ResultNotes } from "./admin-portal";

export default function ParticipantPortal({ view = "plan" }: { view?: "plan" | "progress" }) {
  const [participantId, setParticipantId] = useState("P01");
  const history = useCloudHistory(participantId);
  const live = useLiveFeedback();
  return <PortalShell role="participant">
    <div className="portal-page-heading"><div>
      <p className="section-kicker">PARTICIPANT PERFORMANCE</p>
      <h1>{view === "progress" ? "Exercise progress" : "My sessions"}</h1>
      <p>Attendance and individual results saved in Convex.</p>
    </div><label>Participant <select value={participantId} onChange={e => setParticipantId(e.target.value)}>
      {Array.from({length: 99}, (_, i) => `P${String(i + 1).padStart(2, "0")}`).map(id => <option key={id}>{id}</option>)}
    </select></label></div>
    <p className="inline-notice">Shared prototype access: selecting an ID does not verify identity. The read token grants access to the team's records.</p>
    {history.error && <p role="alert">{history.error}</p>}
    {history.loading && <p role="status">Loading sessions…</p>}
    {!live.client && <p>Connect to Convex using the read token above to view saved sessions.</p>}
    {live.client && !history.loading && !history.records.length && <p>No sessions recorded for {participantId}.</p>}
    {history.records.map(session => {
      const person = session.participants[0];
      return <section className="surface" key={session.id}>
        <h2>{session.exercise_label} · {session.station}</h2>
        <p>{workoutDate(session.started_at)} · {session.finished_at ? `Finished ${workoutDate(session.finished_at)}` : "In progress"}</p>
        <p>{session.criteria.description}</p>
        <div className="table-scroll"><table><thead><tr>
          <th>Reps / target</th><th>Full / short</th><th>Range score</th><th>Coverage</th><th>Tracking losses</th><th>Discarded attempts</th>
        </tr></thead><tbody><tr>
          <td>{person.reps} / {person.target}</td><td>{person.full} / {person.short}</td>
          <td>{percent(person.range_score)}</td><td>{percent(person.tracking_coverage)}</td>
          <td>{person.tracking_losses ?? "Not recorded"}</td><td>{person.discarded_attempts ?? "Not recorded"}</td>
        </tr></tbody></table></div>
        <ResultNotes person={person} />
      </section>;
    })}
    {history.hasMore && <button className="button" onClick={history.loadMore}>Load more sessions</button>}
  </PortalShell>;
}
