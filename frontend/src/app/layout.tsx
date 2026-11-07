import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Alder Rehabilitation | Physiotherapy & exercise",
    template: "%s | Alder Rehabilitation",
  },
  description:
    "Alder Rehabilitation is a fictional clinic for the ECE 198 demonstration, with individual exercise plans and participant progress portals.",
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
