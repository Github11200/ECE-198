import type { Metadata } from "next";
import AdminPortal from "@/components/admin-portal";
export const metadata: Metadata = { title: "Clinic administration" };
export default function Page() {
  return <AdminPortal />;
}
