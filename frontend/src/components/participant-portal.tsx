import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import PortalShell from "./portal-shell";
import ExerciseIllustration from "./exercise-illustration";
import ProgressChart from "./progress-chart";
import { exercisePlan, sessions } from "@/lib/demo-data";

export default function ParticipantPortal({
  view = "plan",
}: {
  view?: "plan" | "progress";
}) {
  const progress = view === "progress";
  return (
    <PortalShell role="participant">
      <div className="portal-page-heading">
        <div>
          <p className="section-kicker">YOUR NEXT STEP, AT YOUR PACE</p>
          <h1>
            {progress ? "Look how far you’ve come." : "Good morning, Alex."}
          </h1>
          <p>
            {progress
              ? "A record of your sessions and the small steps along the way."
              : "Here is your exercise plan. Take it one session at a time."}
          </p>
        </div>
        <div className="date-chip">
          <CalendarDays size={16} /> Monday, 9 November 2026
        </div>
      </div>
      <div className="programme-banner">
        <span className="programme-symbol">
          <ClipboardList size={23} />
        </span>
        <div>
          <strong>Your personal programme</strong>
          <span>
            Rehabilitation & exercise <b>·</b> Week 4 of 8
          </span>
        </div>
        <div className="programme-week">
          <span>Halfway through your programme</span>
          <div className="week-track">
            <i />
          </div>
        </div>
        <span className="pill pill-positive">Active programme</span>
      </div>

      <div className="portal-stats">
        <article>
          <span className="stat-label">
            Sessions attended <Check size={17} />
          </span>
          <strong>
            8 <small>sessions</small>
          </strong>
          <p>Since your programme began</p>
        </article>
        <article>
          <span className="stat-label">
            Latest curl progress <TrendingUp size={17} />
          </span>
          <strong>
            8 <small>/ 10 reps</small>
          </strong>
          <p>2 more reps than your first week</p>
        </article>
        <article>
          <span className="stat-label">
            Your next session <CalendarDays size={17} />
          </span>
          <strong className="stat-date">
            Wed, 11 Nov <small>10:30 AM</small>
          </strong>
          <p>Morning movement · In clinic</p>
        </article>
      </div>

      {progress ? (
        <>
          <ProgressChart />
          <SessionTable />
        </>
      ) : (
        <div className="participant-columns">
          <div>
            <div className="section-title-row">
              <div>
                <h2>Your exercise plan</h2>
                <p>Assigned by Emma Miller, your exercise instructor</p>
              </div>
              <span className="muted-label">3 exercises</span>
            </div>
            <div className="exercise-list">
              {exercisePlan.map((exercise, index) => (
                <details className="exercise-card surface" key={exercise.id}>
                  <summary>
                    <div
                      className={`exercise-art exercise-art-${exercise.illustration}`}
                    >
                      <ExerciseIllustration type={exercise.illustration} />
                    </div>
                    <div className="exercise-summary">
                      <span className="exercise-category">
                        {String(index + 1).padStart(2, "0")} <i />{" "}
                        {exercise.category}
                      </span>
                      <h3>{exercise.name}</h3>
                      <p>{exercise.target}</p>
                      <span className="equipment">{exercise.equipment}</span>
                    </div>
                    <ChevronDown className="exercise-chevron" size={19} />
                  </summary>
                  <div className="exercise-expanded">
                    <p>{exercise.description}</p>
                    <div>
                      <span>
                        Last recorded session<strong>{exercise.last}</strong>
                      </span>
                      <span>
                        Next plan review<strong>16 November 2026</strong>
                      </span>
                    </div>
                  </div>
                </details>
              ))}
            </div>
            <div className="plan-update">
              <Clock3 size={15} /> Last reviewed 4 November 2026{" "}
              <span>Next review 16 November</span>
            </div>
            <div className="surface recent-progress">
              <div>
                <span className="mini-icon">
                  <TrendingUp size={20} />
                </span>
                <h3>Small steps add up.</h3>
                <p>You completed 8 sessions in your programme so far.</p>
              </div>
              <Link href="/participant/progress" className="text-link">
                See your progress <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <aside className="participant-aside">
            <CareTeamCard />
            <section className="surface appointment-card">
              <span className="mini-icon">
                <CalendarDays size={21} />
              </span>
              <h3>See you on Wednesday.</h3>
              <p>
                Your next group session is on{" "}
                <strong>11 November at 10:30 AM.</strong>
              </p>
              <div className="appointment-location">
                <span>Morning movement</span>
                <small>Rehabilitation studio · In clinic</small>
              </div>
            </section>
            <div className="quiet-note">
              <MessageCircle size={19} />
              <p>
                Your plan is individual to you. Questions or changes? Talk with
                your instructor at your next appointment.
              </p>
            </div>
          </aside>
        </div>
      )}
    </PortalShell>
  );
}

function CareTeamCard() {
  return (
    <section className="surface care-team-card">
      <p className="section-kicker">YOUR CARE TEAM</p>
      <div className="care-team-person">
        <span className="avatar avatar-large mint">EM</span>
        <div>
          <h3>Emma Miller</h3>
          <p>Exercise instructor</p>
        </div>
      </div>
      <p className="instructor-note">
        “We will review your curl target together next week. It is good to see
        you finding your routine.”
      </p>
      <span className="note-date">Added to your plan · 9 November</span>
    </section>
  );
}

function SessionTable() {
  return (
    <section className="surface session-table">
      <div className="card-heading">
        <div>
          <h2>Your recent sessions</h2>
          <p>A summary of the exercise recorded at your appointments.</p>
        </div>
        <span className="pill pill-neutral">4 recent sessions</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Exercise</th>
              <th>Completed reps</th>
              <th>Full-range reps</th>
              <th>Instructor note</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.date}>
                <td>
                  <strong>{s.date} 2026</strong>
                  <small>{s.day}</small>
                </td>
                <td>{s.exercise}</td>
                <td>
                  <strong>{s.completed}</strong>
                  <span className="muted"> / {s.target}</span>
                </td>
                <td>{s.range}</td>
                <td>{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-footnote">
        Rep targets can change as your care team reviews your programme.
      </p>
    </section>
  );
}
