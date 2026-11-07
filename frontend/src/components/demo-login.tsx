"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Brand, DemoNote } from "./brand";
import styles from "./demo-login.module.css";

export default function DemoLogin({ role }: { role: "admin" | "participant" }) {
  const router = useRouter();
  const admin = role === "admin";
  const features = admin
    ? ["Participant records", "Individual rep targets", "Group session history"]
    : [
        "Your assigned exercise plan",
        "Your progress over time",
        "Your next appointment",
      ];

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Demo navigation only: neither field is read, stored, or submitted.
    router.push(admin ? "/admin" : "/participant");
  }

  return (
    <div className={styles.page}>
      <header className={`${styles.header} container`}>
        <Brand />
        <Link href="/" className={styles.back}>
          <ArrowLeft size={16} /> Back to the clinic
        </Link>
      </header>
      <main id="main" className={`${styles.main} container`}>
        <section className={styles.intro}>
          <p className="section-kicker">
            {admin ? "FOR YOUR CARE TEAM" : "BETWEEN YOUR APPOINTMENTS"}
          </p>
          <h1>
            {admin ? (
              <>
                Your clinic
                <br />
                workspace.
              </>
            ) : (
              <>
                Your programme.
                <br />
                Your progress.
              </>
            )}
          </h1>
          <p>
            {admin
              ? "Keep your group’s plans, targets, and session records together."
              : "Find your exercise plan and review your recent sessions, all in one place."}
          </p>
          <ul>
            {features.map((feature) => (
              <li key={feature}>
                <Check size={16} /> {feature}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="sign-in-title">
          <p className="section-kicker">
            {admin ? "ADMIN LOGIN" : "PARTICIPANT LOGIN"}
          </p>
          <h2 id="sign-in-title">Sign in</h2>
          <p className={styles.description}>
            {admin
              ? "Open your instructor workspace."
              : "Open your personal programme."}
          </p>
          <form
            onSubmit={signIn}
            noValidate
            autoComplete="off"
            className={styles.form}
          >
            <label htmlFor="demo-name">Name</label>
            <input
              id="demo-name"
              type="text"
              autoComplete="off"
              placeholder="Enter your name"
            />
            <label htmlFor="demo-password">Password</label>
            <input
              id="demo-password"
              type="password"
              autoComplete="off"
              placeholder="Enter any password"
              aria-describedby="demo-login-help"
            />
            <p id="demo-login-help" className={styles.help}>
              Demo access. Any name and password will work.
            </p>
            <button type="submit" className="button">
              Sign in <ArrowRight size={17} />
            </button>
          </form>

          {!admin && (
            <div className={styles.createAccount}>
              <span>New to Alder Rehabilitation?</span>
              <button
                type="button"
                className="button button-outline"
                disabled
                aria-describedby="create-account-help"
              >
                Create account
              </button>
              <p id="create-account-help">
                Account creation is not available in this demo.
              </p>
            </div>
          )}

          <p className={styles.switchRole}>
            {admin
              ? "Looking for your exercise plan?"
              : "Part of the care team?"}{" "}
            <Link href={admin ? "/login/participant" : "/login/admin"}>
              {admin ? "Participant login" : "Admin login"}{" "}
              <ArrowRight size={13} />
            </Link>
          </p>
        </section>
      </main>
      <footer className={`${styles.footer} container`}>
        <span>Alder Rehabilitation</span>
        <DemoNote />
      </footer>
    </div>
  );
}
