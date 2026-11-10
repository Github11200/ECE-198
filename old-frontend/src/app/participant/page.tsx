import type { Metadata } from "next";
import ParticipantPortal from "@/components/participant-portal";
export const metadata: Metadata = { title: "Your exercise plan" };
export default function Page() {
  return <ParticipantPortal />;
}
