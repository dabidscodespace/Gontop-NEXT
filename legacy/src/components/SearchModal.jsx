import { Gamepad2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { searchProducts } from "../api";

const SearchModal = ({ isOpen, onClose }) => {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  // Fetch search results
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const delayDebounce = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError(null);

        const products = await searchProducts(trimmedQuery, 20);

        if (!controller.signal.aborted) {
          setResults(products);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Search error:", err);
          setError("Something went wrong. Try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query]);

  const popularSearches = [
    "Mobile Legends",
    "PUBG",
    "Free Fire",
    "Genshin Impact",
    "Valorant",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 backdrop-blur-sm" />
        <div
          onClick={onClose}
          className="animate-fadeIn absolute inset-0 bg-primary/60 opacity-100"
        />
      </div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg scale-100 transform overflow-hidden rounded-2xl border border-gray-200 bg-white opacity-100 shadow-2xl transition-transform duration-300">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-gray-100 p-4">
          <Search className="h-5 w-5 shrink-0 text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games... (min 2 characters)"
            className="min-w-0 flex-1 bg-transparent text-primary placeholder:text-secondary/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex-shrink-0 cursor-pointer p-1 text-secondary transition-colors hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-shrink-0 cursor-pointer rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-secondary transition-colors hover:bg-secondary hover:text-white"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-4">
          {!query.trim() ? (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-secondary">
                Popular Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-secondary transition-all hover:border-accent-orange hover:bg-accent-orange/10 hover:text-accent-orange"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </>
          ) : query.trim().length < 2 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-secondary">
                Type at least 2 characters to search
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-secondary">
                Results for "<span className="text-accent-orange">{query}</span>"
              </p>

              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-accent-orange/30" />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                      <Search className="h-5 w-5 text-accent-orange" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-secondary">Searching...</p>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={() => setQuery(query)}
                    className="mt-2 text-sm text-accent-orange underline hover:text-accent-orange/80"
                  >
                    Try again
                  </button>
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                    <Search className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="mt-4 font-medium text-primary">
                    No games found
                  </p>
                  <p className="mt-1 text-sm text-secondary">
                    Try searching for something else
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.slug}`}
                      onClick={onClose}
                      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-accent-orange/30 hover:bg-accent-orange/5 hover:shadow-sm"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        {item.images?.[0]?.src ? (
                          <img
                            src={item.images[0].src}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Gamepad2 className="h-6 w-6 text-secondary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-primary transition-colors group-hover:text-accent-orange">
                          {item.name}
                        </p>
                        <p className="text-xs text-secondary">
                          {item.type === "variable" ? "Game Top-up" : "Product"}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-accent-orange/10 px-2 py-1 text-xs font-medium text-accent-orange opacity-0 transition-opacity group-hover:opacity-100">
                        View
                      </div>
                    </Link>
                  ))}
                  <p className="mt-4 text-center text-xs text-secondary">
                    Found {results.length} result
                    {results.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="hidden items-center gap-4 text-xs text-secondary lg:flex">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-primary shadow-sm">
                ↵
              </kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-primary shadow-sm">
                esc
              </kbd>
              <span>to close</span>
            </span>
          </div>
          <div className="mx-auto flex items-center gap-2 text-xs text-secondary lg:mx-0">
            Powered by <img src="/logo.png" className="h-5" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;