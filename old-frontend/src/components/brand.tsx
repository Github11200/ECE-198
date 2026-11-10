import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="Alder Rehabilitation home"
    >
      <svg
        className="brand-mark"
        viewBox="0 0 42 44"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="40"
          height="42"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m10 32 11-21 11 21M14.4 24h13.2"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-wordmark">
        <strong>Alder</strong>
        <span>REHABILITATION</span>
      </span>
    </Link>
  );
}

export function DemoNote() {
  return (
    <span className="demo-note">
      ECE 198 classroom demo <span aria-hidden="true">·</span> Fictional
      participant records
    </span>
  );
}
