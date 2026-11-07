import { CalendarDays, ChevronDown, Clock3 } from "lucide-react";
import {
  averageScore,
  dayScore,
  exerciseHistory,
  exerciseNames,
  historyDate,
  recordedSessionCount,
} from "@/lib/exercise-history";
import ScoreBadge, { ScoreLegend } from "./score-badge";
import styles from "./session-history.module.css";

export default function SessionHistory() {
  return (
    <section
      id="session-history"
      className={`surface ${styles.history}`}
      aria-labelledby="history-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="history-title">Past exercise sessions</h2>
          <p>
            Open a date to see that day’s sessions and the exercises you
            completed.
          </p>
        </div>
        <span className="pill pill-neutral">
          {recordedSessionCount} sessions · {exerciseHistory.length} days
        </span>
      </div>
      <ScoreLegend />
      <div className={styles.days}>
        {exerciseHistory.map((day, index) => (
          <details className={styles.day} key={day.date} open={index === 0}>
            <summary className={styles.daySummary}>
              <span className={styles.calendarIcon}>
                <CalendarDays size={21} aria-hidden="true" />
              </span>
              <span className={styles.date}>
                <time dateTime={day.date}>{historyDate(day.date)}</time>
                <span>
                  {day.sessions.length}{" "}
                  {day.sessions.length === 1 ? "session" : "sessions"} ·{" "}
                  {day.sessions.reduce(
                    (total, session) => total + session.exercises.length,
                    0,
                  )}{" "}
                  exercise records
                </span>
              </span>
              <span className={styles.dayScore}>
                <span>Day average</span>
                <ScoreBadge score={dayScore(day)} />
              </span>
              <ChevronDown
                className={styles.chevron}
                size={19}
                aria-hidden="true"
              />
            </summary>
            <div className={styles.dayBody}>
              {day.sessions.map((session) => (
                <article
                  className={styles.session}
                  key={session.id}
                  aria-labelledby={`session-${session.id}`}
                >
                  <div className={styles.sessionHeading}>
                    <div>
                      <h3 id={`session-${session.id}`}>{session.name}</h3>
                      <p>
                        <Clock3 size={13} aria-hidden="true" /> {session.time} ·{" "}
                        {session.minutes} min · {session.location}
                      </p>
                    </div>
                    <span className={styles.sessionScore}>
                      <span>Session score</span>
                      <ScoreBadge score={averageScore(session.exercises)} />
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table className={styles.exercises}>
                      <caption className="sr-only">
                        Exercises from {session.name}, {historyDate(day.date)},{" "}
                        {session.time}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Exercise</th>
                          <th scope="col">Completed reps / target</th>
                          <th scope="col">Demo score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.exercises.map((exercise) => (
                          <tr key={exercise.exerciseId}>
                            <th scope="row">
                              {exerciseNames[exercise.exerciseId]}
                            </th>
                            <td>
                              {exercise.reps}{" "}
                              <span className="muted">/ {exercise.target}</span>
                            </td>
                            <td>
                              <ScoreBadge score={exercise.score} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
      <p className={styles.footnote}>
        Prepared demo records. Scores are illustrative; day and session scores
        are averages of the exercise scores shown.
      </p>
    </section>
  );
}
