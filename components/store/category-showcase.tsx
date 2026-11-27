"use client";

import { useEffect, useRef, useState } from "react";

import { ProductGrid } from "@/components/store/product-card";
import { VariantModal } from "@/components/store/variant-modal";
import type { HomeCard, StoreCategory } from "@/lib/services/catalog";

const sectionBg = { backgroundImage: "url('/swiper_bg.svg')" };

/**
 * Sticky pill bar plus one in-page section per category. Pills scroll to their section
 * (scroll-mt-32 keeps headings clear of the sticky bars) and the pill for the section in
 * view is highlighted. Cards are the original product card; the card's href decides
 * whether it opens a game's variants or a product page.
 */
export function CategoryShowcase({ categories }: { categories: StoreCategory[] }) {
  const visible = categories.filter((category) => category.items.length > 0);
  const [activeSlug, setActiveSlug] = useState<string | null>(visible[0]?.slug ?? null);
  const navRef = useRef<HTMLDivElement>(null);
  // Parent game whose regional variants are open in the modal (Popular Games only).
  const [openGame, setOpenGame] = useState<HomeCard | null>(null);

  useEffect(() => {
    if (visible.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // The band between the sticky bars and 60% of the viewport decides the active section.
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSlug(entry.target.id.replace("category-", ""));
        }
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    visible.forEach((category) => {
      const el = document.getElementById(`category-${category.slug}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((c) => c.slug).join("|")]);

  useEffect(() => {
    // Keep the active pill visible when the bar scrolls horizontally on mobile.
    const pill = navRef.current?.querySelector<HTMLElement>(`[data-active="true"]`);
    pill?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeSlug]);

  if (visible.length === 0) {
    return (
      <section className="bg-cover bg-center bg-repeat-y" style={sectionBg}>
        <div className="mx-auto max-w-6xl px-3">
          <div className="py-6 lg:py-8">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 py-16 text-center">
              <p className="text-sm font-medium text-gray-600">No games available yet.</p>
              <p className="mt-1 text-xs text-gray-400">
                Categories you add in the admin panel will appear here.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <nav className="sticky top-16 z-40 bg-cover bg-center bg-repeat-y py-1" style={sectionBg}>
        <div className="mx-auto max-w-6xl overflow-hidden px-3">
          <div ref={navRef} className="no-scrollbar flex gap-3 overflow-x-auto">
            {visible.map((category) => {
              const active = category.slug === activeSlug;
              return (
                <a
                  key={category.id}
                  href={`#category-${category.slug}`}
                  data-active={active}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => {
                    const el = document.getElementById(`category-${category.slug}`);
                    if (!el) return;
                    event.preventDefault();
                    setActiveSlug(category.slug);
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.replaceState(null, "", `#category-${category.slug}`);
                  }}
                  className={
                    active
                      ? "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-dashed border-orange-500 bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-orange-500/30"
                      : "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-dashed border-gray-600 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-orange-400 hover:text-orange-500"
                  }
                >
                  {category.name}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      <section className="bg-cover bg-center bg-repeat-y" style={sectionBg}>
        <div className="mx-auto max-w-6xl px-3">
          <div className="py-6 lg:py-8">
            {visible.map((category) => (
              <div
                key={category.id}
                id={`category-${category.slug}`}
                className="scroll-mt-32 pb-10 last:pb-0"
              >
                <div className="mb-8 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-black">{category.name}</h2>
                    <img src="/fire.gif" alt="" className="-mt-1 h-8 w-8" />
                  </div>
                </div>
                <ProductGrid
                  products={category.items}
                  onOpen={category.layout === "parent_games" ? setOpenGame : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      {openGame?.variants && (
        <VariantModal title={openGame.name} variants={openGame.variants} onClose={() => setOpenGame(null)} />
      )}
    </>
  );
}
