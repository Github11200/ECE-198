import type { Metadata } from "next";
import DemoLogin from "@/components/demo-login";

export const metadata: Metadata = { title: "Admin login" };

export default function Page() {
  return <DemoLogin role="admin" />;
}
