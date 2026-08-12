"use client";

import { Clock, Search, TrendingUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import {
  formatPrice,
  getImageUrl,
  getPrice,
  type PagedResult,
  type Product,
} from "@/lib/catalog";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 5;
const HISTORY_KEY = "search-history";
const HISTORY_MAX = 8;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, HISTORY_MAX)
      : [];
  } catch {
    return [];
  }
}

function saveHistory(term: string) {
  const trimmed = term.trim();
  if (trimmed.length < 2) return;
  const next = [trimmed, ...loadHistory().filter((x) => x.toLowerCase() !== trimmed.toLowerCase())]
    .slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

/** Header arama kutusu — debounce, geçmiş, popüler aramalar. */
export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setHistory(loadHistory());
    fetch(`${API_URL}/catalog/products/popular-searches?take=8`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        const items = Array.isArray(data) ? data : [];
        setPopular(
          items
            .map((x) =>
              typeof x === "string"
                ? x
                : typeof x === "object" && x && "query" in x
                  ? String((x as { query: string }).query)
                  : "",
            )
            .filter(Boolean),
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(
          `${API_URL}/catalog/products/search?search=${encodeURIComponent(q)}&pageSize=${PAGE_SIZE}`,
          { signal: ac.signal, cache: "no-store" },
        );
        if (!res.ok) {
          setResults([]);
          setOpen(true);
          return;
        }
        const data = (await res.json()) as PagedResult<Product> | Product[];
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        setResults(items.slice(0, PAGE_SIZE));
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [term]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToProducts = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      saveHistory(trimmed);
      setHistory(loadHistory());
    }
    setOpen(false);
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products");
  };

  const goToProduct = (id: string) => {
    if (term.trim()) {
      saveHistory(term);
      setHistory(loadHistory());
    }
    setOpen(false);
    setTerm("");
    router.push(`/products/${id}`);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToProduct(results[activeIndex].id);
      return;
    }
    goToProducts(term);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && results.length) {
      setOpen(true);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      goToProduct(results[activeIndex].id);
    }
  };

  const qLen = term.trim().length;
  const showSuggestPanel = open && qLen < 2 && (history.length > 0 || popular.length > 0);
  const showDropdown = open && qLen >= 2;

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <form onSubmit={submit} role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Ürün, kategori veya marka ara..."
          aria-label="Ürün ara"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown || showSuggestPanel}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          role="combobox"
          autoComplete="off"
          className="h-11 w-full rounded-lg border-none bg-gray-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:ring-1 focus:ring-gray-200"
        />
      </form>

      {showSuggestPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
          {history.length > 0 && (
            <div className="px-3 pb-2">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Clock className="h-3.5 w-3.5" /> Geçmiş
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Temizle
                </button>
              </div>
              <ul className="space-y-0.5">
                {history.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => goToProducts(h)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-muted"
                    >
                      <Clock className="h-3.5 w-3.5 text-gray-300" />
                      <span className="truncate">{h}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {popular.length > 0 && (
            <div className="border-t border-gray-50 px-3 pt-2">
              <span className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <TrendingUp className="h-3.5 w-3.5" /> Popüler
              </span>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {popular.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToProducts(p)}
                    className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          {loading && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Aranıyor…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3">
              <p className="text-sm text-muted-foreground">Sonuç bulunamadı</p>
              {popular.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Bunları deneyin:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popular.slice(0, 5).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setTerm(p);
                          goToProducts(p);
                        }}
                        className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ) : (
            <>
              {results.map((product, index) => {
                const image = getImageUrl(product);
                const price = getPrice(product);
                const active = index === activeIndex;

                return (
                  <li
                    key={product.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={active}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToProduct(product.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-muted" : "hover:bg-muted/70"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Search className="h-4 w-4 text-gray-300" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium text-gray-900">
                          {product.name}
                        </span>
                        {product.brandName && (
                          <span className="block text-xs text-gray-400">
                            {product.brandName}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatPrice(price)}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => goToProducts(term)}
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-muted"
                >
                  Tüm sonuçları gör →
                </button>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
