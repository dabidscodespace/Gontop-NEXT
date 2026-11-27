import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await getSession();
  if (admin) redirect("/admin");
  return children;
}
