import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";

export const metadata: Metadata = {
  title: {
    default: "CCCARE Exercise Tracker | Alder Rehabilitation",
    template: "%s | Alder Rehabilitation",
  },
  description:
    "CCCARE Exercise Tracker: supervised group sessions, individual rep targets, live range cues, and saved workout reports. Waterloo ECE 198 prototype.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
