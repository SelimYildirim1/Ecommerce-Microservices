"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  type PagedResult,
  type Product,
} from "@/lib/catalog";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/recently-viewed";
import {
  brandSuggestHref,
  categorySuggestHref,
  firstNameOf,
  type ActiveCampaign,
  type SearchSuggestDto,
} from "@/lib/search-suggest";
import {
  SearchDiscoverPanel,
  SearchSuggestPanel,
  type SuggestRow,
} from "@/components/SearchMegaMenu";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 4;
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

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function popularFromPayload(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((x) =>
      typeof x === "string"
        ? x
        : typeof x === "object" && x && "query" in x
          ? String((x as { query: string }).query)
          : "",
    )
    .filter(Boolean);
}

function buildRows(
  term: string,
  suggest: SearchSuggestDto | null,
  campaigns: ActiveCampaign[],
  products: Product[],
): SuggestRow[] {
  const q = term.trim().toLocaleLowerCase("tr-TR");
  const rows: SuggestRow[] = [];

  for (const item of suggest?.categories ?? []) {
    rows.push({ key: `cat-${item.id}`, kind: "category", item });
  }
  for (const text of suggest?.queries ?? []) {
    rows.push({ key: `q-${text}`, kind: "query", text });
  }
  for (const campaign of campaigns) {
    if (campaign.name.toLocaleLowerCase("tr-TR").includes(q)) {
      rows.push({ key: `camp-${campaign.id}`, kind: "campaign", campaign });
    }
  }
  for (const item of suggest?.brands ?? []) {
    rows.push({ key: `brand-${item.id}`, kind: "brand", item });
  }
  for (const product of products) {
    rows.push({ key: `p-${product.id}`, kind: "product", product });
  }
  rows.push({ key: "all", kind: "all", term });
  return rows;
}

/** Header arama — tıklayınca keşif mega menü, yazınca kategori/marka önerileri. */
export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const listboxId = useId();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [suggest, setSuggest] = useState<SearchSuggestDto | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [picks, setPicks] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const discoverLoaded = useRef(false);

  useEffect(() => {
    setTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setHistory(loadHistory());
    setRecent(getRecentlyViewed());
  }, []);

  useEffect(() => {
    if (!open || discoverLoaded.current) return;
    discoverLoaded.current = true;

    const load = async () => {
      const [popRes, bestRes, dealRes, campRes] = await Promise.all([
        fetch(`${API_URL}/catalog/products/popular-searches?take=16`, { cache: "no-store" }),
        fetch(`${API_URL}/catalog/products/bestsellers?take=8`, { cache: "no-store" }),
        fetch(`${API_URL}/catalog/products/deals?take=8`, { cache: "no-store" }),
        fetch(`${API_URL}/promotions/campaigns/active?take=6`, { cache: "no-store" }),
      ]);

      setPopular(popularFromPayload(await readJson(popRes, [])));

      const best = await readJson<Product[]>(bestRes, []);
      const deals = await readJson<Product[]>(dealRes, []);
      setPicks(Array.isArray(best) && best.length > 0 ? best : Array.isArray(deals) ? deals : []);
      setCampaigns(await readJson<ActiveCampaign[]>(campRes, []));
    };

    load().catch(() => undefined);
  }, [open]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setSuggest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const [searchRes, suggestRes] = await Promise.all([
          fetch(
            `${API_URL}/catalog/products/search?search=${encodeURIComponent(q)}&pageSize=${PAGE_SIZE}`,
            { signal: ac.signal, cache: "no-store" },
          ),
          fetch(
            `${API_URL}/catalog/products/suggest?q=${encodeURIComponent(q)}&take=8`,
            { signal: ac.signal, cache: "no-store" },
          ),
        ]);

        const data = await readJson<PagedResult<Product> | Product[]>(searchRes, []);
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        setResults(items.slice(0, PAGE_SIZE));

        const sug = await readJson<SearchSuggestDto | null>(suggestRes, null);
        setSuggest(
          sug && typeof sug === "object"
            ? {
                categories: sug.categories ?? [],
                brands: sug.brands ?? [],
                queries: sug.queries ?? [],
              }
            : { categories: [], brands: [], queries: [] },
        );
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setSuggest(null);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const qLen = term.trim().length;
  const typing = qLen >= 2;
  const rows = typing ? buildRows(term, suggest, campaigns, results) : [];

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

  const pickRow = (row: SuggestRow) => {
    if (row.kind === "category") {
      setOpen(false);
      router.push(categorySuggestHref(row.item));
      return;
    }
    if (row.kind === "brand") {
      setOpen(false);
      router.push(brandSuggestHref(row.item));
      return;
    }
    if (row.kind === "query") {
      goToProducts(row.text);
      return;
    }
    if (row.kind === "campaign") {
      setOpen(false);
      router.push("/products");
      return;
    }
    if (row.kind === "product") {
      goToProduct(row.product.id);
      return;
    }
    goToProducts(row.term);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typing && activeIndex >= 0 && rows[activeIndex]) {
      pickRow(rows[activeIndex]);
      return;
    }
    goToProducts(term);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || !typing || rows.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickRow(rows[activeIndex]);
    }
  };

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <form onSubmit={submit} role="search" className="relative">
        <Search
          className={`pointer-events-none absolute left-3.5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 ${
            open ? "text-gray-700" : "text-gray-400"
          }`}
        />

        <input
          type="search"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setRecent(getRecentlyViewed());
            setHistory(loadHistory());
          }}
          onKeyDown={onKeyDown}
          placeholder="Ürün, kategori veya marka ara"
          aria-label="Ürün ara"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          role="combobox"
          autoComplete="off"
          className={`h-11 w-full rounded-full pl-11 pr-10 text-sm outline-none transition placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden ${
            open
              ? "border border-gray-300 bg-white shadow-sm"
              : "border border-transparent bg-gray-50 focus:border-gray-200"
          }`}
        />

        {term.length > 0 && (
          <button
            type="button"
            aria-label="Aramayı temizle"
            onClick={() => {
              setTerm("");
              setResults([]);
              setSuggest(null);
              setActiveIndex(-1);
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {typing ? (
            <SearchSuggestPanel
              query={term}
              rows={rows}
              loading={loading}
              activeIndex={activeIndex}
              listboxId={listboxId}
              onHover={setActiveIndex}
              onPick={pickRow}
              onSearch={goToProducts}
            />
          ) : (
            <SearchDiscoverPanel
              recent={recent}
              history={history}
              popular={popular}
              picks={picks}
              greetingName={firstNameOf(user?.name)}
              onSearch={(value) => {
                setTerm(value);
                goToProducts(value);
              }}
              onClearHistory={clearHistory}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
