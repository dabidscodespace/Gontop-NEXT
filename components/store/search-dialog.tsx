"use client";

import Link from "next/link";
import { Gamepad2, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  gameName: string;
};

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok) setResults(data.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 px-3 pt-16 backdrop-blur-sm sm:pt-24">
      <div className="animate-fade-in w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games and top-ups..."
            className="h-9 min-w-0 flex-1 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center">
              <Gamepad2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                {query ? "No games match your search." : "Start typing to find a game."}
              </p>
            </div>
          ) : (
            results.map((result) => (
              <Link
                key={result.id}
                href={`/product/${result.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-orange-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  {result.image ? (
                    <img src={result.image} alt={result.name} className="h-full w-full object-cover" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{result.name}</p>
                  <p className="text-xs text-gray-500">{result.gameName}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
