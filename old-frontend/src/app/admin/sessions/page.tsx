import type { Metadata } from "next";
import AdminPortal from "@/components/admin-portal";
export const metadata: Metadata = { title: "Session history" };
export default function Page() {
  return <AdminPortal view="sessions" />;
}
