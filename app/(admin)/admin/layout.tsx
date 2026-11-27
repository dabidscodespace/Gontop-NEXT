import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
