import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MoveUpRight,
  Phone,
  ShieldCheck,
} from "lucide-react";
import ClinicHeader from "@/components/clinic-header";
import { Brand, DemoNote } from "@/components/brand";

const steps = [
  {
    n: "01",
    title: "Your first appointment",
    text: "Discuss your current movement, daily activities, and goals with your care team. There is time to ask questions and agree on a starting point.",
  },
  {
    n: "02",
    title: "An individual exercise plan",
    text: "Leave with a clear programme to follow. Your assigned exercises, rep targets, and appointments are available in your participant portal.",
  },
  {
    n: "03",
    title: "Regular reviews",
    text: "Meet with your instructor to review your recent sessions, talk through any difficulties, and update your plan when needed.",
  },
];

export default function ClinicPage() {
  return (
    <>
      <ClinicHeader />
      <main id="main">
        <section className="clinic-hero" aria-labelledby="hero-heading">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="section-kicker">
                <span /> PHYSIOTHERAPY & GUIDED EXERCISE
              </div>
              <h1 id="hero-heading">
                Rehabilitation for
                <br />
                <em>everyday life.</em>
              </h1>
              <p>
                Physiotherapy, guided exercise, and support as you return to
                your usual activities. A practical programme, reviewed with the
                same care team.
              </p>
              <div className="hero-actions">
                <Link href="/participant" className="button">
                  View your exercise plan <ArrowUpRight size={18} />
                </Link>
                <a href="#approach" className="text-link">
                  Our approach <ArrowRight size={17} />
                </a>
              </div>
              <div className="hero-reassurance">
                <span>
                  <Check size={15} /> Individual appointments
                </span>
                <span>
                  <Check size={15} /> Small-group exercise
                </span>
              </div>
            </div>
            <figure className="hero-photo-wrap">
              <div className="photo-frame">
                <img
                  className="hero-photo"
                  src="/images/rehabilitation-session.jpg"
                  alt="A physiotherapist supporting a man during a supervised movement exercise"
                  fetchPriority="high"
                />
              </div>
              <figcaption className="photo-caption">
                <strong>Guidance with each movement.</strong>
                <span>
                  Individual support, in the clinic and between visits.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <div className="programme-strip">
          <div className="container">
            <span>Practical rehabilitation</span>
            <p>
              Movement & mobility <i /> Recovery after injury <i /> Supported
              exercise
            </p>
            <a href="#programme">
              About the programme <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <section id="programme" className="section container programme-section">
          <div className="programme-intro">
            <p className="section-kicker">YOUR REHABILITATION PROGRAMME</p>
            <h2>
              A plan for your
              <br />
              daily routine.
            </h2>
          </div>
          <div className="programme-description">
            <p className="lead">
              A personal plan, a dedicated instructor, and regular time to
              review how you are doing.
            </p>
            <p>
              Alder Rehabilitation combines individual appointments with guided
              exercise. Your care team helps you understand the plan, keeps a
              record of your sessions, and reviews your goals with you.
            </p>
            <a href="#approach" className="text-link">
              Get to know the programme <ArrowUpRight size={17} />
            </a>
          </div>
        </section>

        <section id="approach" className="approach-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="section-kicker">WHAT TO EXPECT</p>
                <h2>
                  Getting started
                  <br />
                  with your programme.
                </h2>
              </div>
              <p>
                Know what to expect at your first appointment and how your care
                team will support you between visits.
              </p>
            </div>
            <div className="care-steps">
              {steps.map((step) => (
                <article className="care-step" key={step.n}>
                  <span className="step-number">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="care-team" className="section container team-section">
          <div className="team-photo">
            <img
              src="/images/physiotherapy-care.jpg"
              alt="A physiotherapist assisting a patient with a leg movement in a clinic"
              loading="lazy"
            />
          </div>
          <div className="team-copy">
            <p className="section-kicker">CONTINUITY OF CARE</p>
            <h2>
              Work with a
              <br />
              dedicated care team.
            </h2>
            <p>
              Discuss your goals with your instructor, ask questions about your
              plan, and review what has changed since your last visit. Your
              exercise record helps keep those conversations specific to you.
            </p>
            <ul className="check-list">
              <li>
                <Check /> An individual exercise plan
              </li>
              <li>
                <Check /> Regular appointments and check-ins
              </li>
              <li>
                <Check /> Progress you and your instructor can follow
              </li>
            </ul>
            <Link href="/participant" className="button button-outline">
              Visit the participant portal <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>

        <section className="portal-callout container">
          <div className="portal-mark">
            <ShieldCheck size={29} />
          </div>
          <div>
            <p className="section-kicker">
              YOUR PROGRAMME, BETWEEN APPOINTMENTS
            </p>
            <h2>Your exercise plan and progress, in one place.</h2>
            <p>
              See your exercise plan, upcoming sessions, and personal progress.
            </p>
          </div>
          <Link href="/participant" className="button">
            Participant login <ArrowRight size={18} />
          </Link>
        </section>

        <section id="contact" className="section container contact-section">
          <div>
            <p className="section-kicker">QUESTIONS ABOUT YOUR PROGRAMME?</p>
            <h2>
              Speak with
              <br />
              your care team.
            </h2>
          </div>
          <div>
            <p>
              Already enrolled? Your programme and instructor’s details are
              available in your participant portal.
            </p>
            <Link href="/participant" className="text-link">
              Find your care team <MoveUpRight size={17} />
            </Link>
            <p className="contact-small">
              <Phone size={15} /> Prefer to talk? Bring your questions to your
              next appointment.
            </p>
          </div>
        </section>
      </main>
      <footer className="clinic-footer">
        <div className="container footer-top">
          <Brand />
          <p>
            Physiotherapy & guided exercise.
            <br />A plan for everyday life.
          </p>
          <nav aria-label="Footer">
            <Link href="/participant">Participant portal</Link>
            <Link href="/admin">Clinic administration</Link>
            <a href="#approach">
              Our approach <ArrowUpRight size={14} />
            </a>
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>
            Alder Rehabilitation is a fictional clinic created for this
            demonstration.
          </span>
          <DemoNote />
        </div>
      </footer>
    </>
  );
}
