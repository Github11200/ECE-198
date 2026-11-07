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
          <a href="/#programme" onClick={() => setOpen(false)}>
            Rehabilitation
          </a>
          <a href="/#approach" onClick={() => setOpen(false)}>
            Our approach
          </a>
          <a href="/#care-team" onClick={() => setOpen(false)}>
            Your care team
          </a>
          <a href="/#contact" onClick={() => setOpen(false)}>
            Contact
          </a>
          <div className="nav-logins">
            <Link href="/admin" className="admin-login">
              Admin login
            </Link>
            <Link href="/participant" className="button button-small">
              Participant login <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
