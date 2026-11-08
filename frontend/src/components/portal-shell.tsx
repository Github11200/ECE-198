"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UsersRound,
} from "lucide-react";
import { Brand, DemoNote } from "./brand";

export default function PortalShell({
  role,
  children,
}: {
  role: "admin" | "participant";
  children: React.ReactNode;
}) {
  const path = usePathname().replace(/\/$/, "") || "/";
  const admin = role === "admin";
  const links = admin
    ? [
        { href: "/admin", title: "Overview", icon: LayoutDashboard },
        {
          href: "/admin/participants",
          title: "Participants",
          icon: UsersRound,
        },
        {
          href: "/admin/sessions",
          title: "Session history",
          icon: CalendarDays,
        },
      ]
    : [
        {
          href: "/participant",
          title: "My exercise plan",
          icon: ClipboardList,
        },
        {
          href: "/participant/progress",
          title: "My progress",
          icon: BarChart3,
        },
      ];
  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-brand">
          <Brand compact />
          <span>{admin ? "CLINIC ADMINISTRATION" : "PARTICIPANT PORTAL"}</span>
        </div>
        <div className="workspace-label">
          {admin ? "Your workspace" : "Your programme"}
        </div>
        <nav aria-label="Portal navigation">
          {links.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "sidebar-link active" : "sidebar-link"}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={19} />
              {title}
              {path === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <CircleHelp size={19} />
            <strong>{admin ? "Lane assignments" : "Programme questions"}</strong>
            <p>
              {admin
                ? "Assign an ID to each lane before starting. Participants stay in their assigned lanes during the session."
                : "Have a question about your plan? Bring it to your next check-in."}
            </p>
          </div>
          <Link href="/" className="sidebar-link">
            <ArrowLeft size={18} /> Back to the clinic
          </Link>
          <div className="sidebar-user">
            <span className="avatar mint">{admin ? "AD" : "AM"}</span>
            <div>
              <strong>{admin ? "Instructor" : "Alex Morgan"}</strong>
              <span>{admin ? "Exercise instructor" : "Participant · P01"}</span>
            </div>
            <Link href="/" aria-label="Leave demo portal">
              <LogOut size={18} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-topbar">
          <div>
            <span className="portal-topbar-label">
              {admin ? "Clinic workspace" : "Your rehabilitation programme"}
            </span>
            <span className="sample-badge">Demo account</span>
          </div>
          <Link href={admin ? "/login/participant" : "/login/admin"}>
            View {admin ? "participant" : "admin"} portal{" "}
            <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="main" className="portal-content">
          {children}
        </main>
        <footer className="portal-footer">
          <span>
            Alder Rehabilitation <span aria-hidden="true">/</span> CCCARE
            Exercise Tracker
          </span>
          {admin ? <span className="demo-note">ECE 198 classroom demo · Numbered participant results</span> : <DemoNote />}
        </footer>
      </div>
    </div>
  );
}
