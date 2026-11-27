import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white">
          <Gamepad2 className="h-8 w-8 text-gray-400" />
        </div>
        <p className="mt-4 text-lg font-bold text-gray-800">Page not found</p>
        <p className="mt-1 text-sm text-gray-500">
          This page doesn&apos;t exist or is no longer available.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-lg bg-accent-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Back to GONTOP
        </Link>
      </div>
    </div>
  );
}
