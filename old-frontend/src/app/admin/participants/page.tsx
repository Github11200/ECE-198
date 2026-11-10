import type { Metadata } from "next";
import AdminPortal from "@/components/admin-portal";
export const metadata: Metadata = { title: "Participants" };
export default function Page() {
  return <AdminPortal view="participants" />;
}
