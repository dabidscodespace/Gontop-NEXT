"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function DrawerBehavior({ closeHref }: { closeHref: string }) {
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeHref, router]);

  return null;
}

export function DrawerClose({
  href,
  children,
  className,
  label,
}: {
  href: string;
  children?: ReactNode;
  className?: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => router.replace(href, { scroll: false })}
      className={className}
    >
      {children}
    </button>
  );
}
