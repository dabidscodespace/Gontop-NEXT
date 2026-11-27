import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/store/auth-forms";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ user }, params] = await Promise.all([getSession(), searchParams]);
  if (user) redirect("/");

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cover bg-center bg-repeat-y px-3 py-10" style={{ backgroundImage: "url('/swiper_bg.svg')" }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
        <RegisterForm next={params.next} />
      </div>
    </div>
  );
}
