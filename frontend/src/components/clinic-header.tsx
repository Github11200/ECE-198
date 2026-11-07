"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";

export default function ClinicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="clinic-header">
      <div className="container header-inner">
        <Brand />
        <button
          className="mobile-menu icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={`clinic-nav ${open ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          <a href="/#workflow" onClick={() => setOpen(false)}>
            Session workflow
          </a>
          <a href="/#exercises" onClick={() => setOpen(false)}>
            Exercises
          </a>
          <a href="/#about" onClick={() => setOpen(false)}>
            About
          </a>
          <div className="nav-logins">
            <Link href="/login/admin" className="admin-login">
              Admin Panel
            </Link>
            <Link href="/login/participant" className="button button-small">
              Participant login <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
