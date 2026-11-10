import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ClinicHeader from "@/components/clinic-header";
import { Brand } from "@/components/brand";

const workflow = [
  { title: "Set up the group", text: "Choose an exercise, assign participant IDs to camera lanes, and set a rep target for each person." },
  { title: "Monitor the session", text: "Follow individual rep counts, range cues, and tracking availability while participants exercise." },
  { title: "Save and review", text: "End the session to save each participant’s results. Review short attempts, tracking notes, and the workout report." },
];

export default function ClinicPage() {
  return <>
    <ClinicHeader />
    <main id="main" className="workspace-home">
      <section className="container tracker-home-intro" aria-labelledby="home-title">
        <div className="tracker-home-copy">
          <p className="section-kicker">CCCARE · ECE 198 PROJECT</p>
          <h1 id="home-title">Exercise session tracker</h1>
          <p className="tracker-home-lead">Set participant targets, monitor exercise activity, and review the results of a supervised group session.</p>
          <div className="tracker-home-actions">
            <Link href="/login/admin" className="button">Open Admin Panel <ArrowRight size={17} /></Link>
            <Link href="/login/participant" className="button button-outline">Participant portal</Link>
          </div>
          <p className="tracker-home-caption">The Admin Panel connects to the local tracker. Participant programme pages contain sample records.</p>
        </div>
        <figure className="tracker-home-photo">
          <img src="/images/rehabilitation-session.jpg" alt="A physiotherapist supporting a participant during an exercise" fetchPriority="high" />
          <figcaption>Supervised exercise · Stock photograph</figcaption>
        </figure>
      </section>

      <section id="workflow" className="container tracker-home-section" aria-labelledby="workflow-title">
        <div className="tracker-home-section-heading"><h2 id="workflow-title">Session workflow</h2><p>One exercise and one group at a time.</p></div>
        <ol className="tracker-workflow">{workflow.map((step, index) => <li key={step.title}>
          <span className="tracker-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div>
        </li>)}</ol>
      </section>

      <section id="exercises" className="container tracker-home-section tracker-home-details" aria-labelledby="exercise-title">
        <div><h2 id="exercise-title">Exercise options</h2><p>Select the movement and review its fixed demo criteria in the Admin Panel.</p></div>
        <dl className="tracker-exercise-list">
          <div><dt>Strength</dt><dd>Seated right-arm curls, squats, pushups</dd></div>
          <div><dt>Chair-based movements</dt><dd>Seated knee extensions, shoulder raises, marches, and sit-to-stand</dd></div>
          <div><dt>Saved results</dt><dd>Reps completed, range target reached, tracking coverage, and per-participant review notes</dd></div>
        </dl>
      </section>

      <section id="about" className="container tracker-home-section tracker-home-about" aria-labelledby="about-title">
        <div><h2 id="about-title">About the prototype</h2><p>A Waterloo ECE 198 project for tracking exercise activity and range during supervised CCCARE sessions. Participants use numbered IDs assigned by the instructor.</p></div>
        <Link className="text-link" href="/login/admin">Go to session setup <ArrowRight size={17} /></Link>
      </section>
    </main>
    <footer className="clinic-footer tracker-home-footer"><div className="container">
      <Brand compact /><span>CCCARE Exercise Tracker · Classroom prototype</span>
      <nav aria-label="Footer"><Link href="/login/admin">Admin Panel</Link><Link href="/login/participant">Participant portal</Link></nav>
    </div></footer>
  </>;
}
