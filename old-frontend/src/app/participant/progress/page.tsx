import type { Metadata } from "next";
import ParticipantPortal from "@/components/participant-portal";
export const metadata: Metadata = { title: "Your progress" };
export default function Page() {
  return <ParticipantPortal view="progress" />;
}
