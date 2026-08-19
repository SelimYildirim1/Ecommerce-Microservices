"use client";

import {
  ChevronRight,
  Megaphone,
  Search,
  Star,
  Store,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatPrice,
  getCompareAtPrice,
  getImageUrl,
  getPrice,
  resolveMediaUrl,
  type Product,
} from "@/lib/catalog";
import type { RecentlyViewedItem } from "@/lib/recently-viewed";
import type { ActiveCampaign, SearchSuggestItem } from "@/lib/search-suggest";

export type SuggestRow =
  | { key: string; kind: "category"; item: SearchSuggestItem }
  | { key: string; kind: "query"; text: string }
  | { key: string; kind: "campaign"; campaign: ActiveCampaign }
  | { key: string; kind: "brand"; item: SearchSuggestItem }
  | { key: string; kind: "product"; product: Product }
  | { key: string; kind: "all"; term: string };

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLocaleLowerCase("tr-TR").indexOf(q.toLocaleLowerCase("tr-TR"));
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold">{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </>
  );
}

function RatingLine({
  rating,
  count,
}: {
  rating?: number | null;
  count?: number;
}) {
  if (!rating || !count) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
      <span className="text-gray-400">({count})</span>
    </span>
  );
}

function HScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 12);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          aria-label="Daha fazla"
          onClick={() =>
            ref.current?.scrollBy({ left: 280, behavior: "smooth" })
          }
          className="absolute -right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white shadow-md hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 hover:text-foreground"
        >
          Tümünü Gör
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Search className="h-4 w-4 text-gray-300" />
      )}
    </span>
  );
}

export function SearchDiscoverPanel({
  recent,
  history,
  popular,
  picks,
  greetingName,
  onSearch,
  onClearHistory,
  onClose,
}: {
  recent: RecentlyViewedItem[];
  history: string[];
  popular: string[];
  picks: Product[];
  greetingName: string | null;
  onSearch: (term: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}) {
  const pickTitle = greetingName
    ? `${greetingName}, sana özel ürünler`
    : "Sana özel ürünler";

  return (
    <div className="max-h-[min(70vh,36rem)] space-y-5 overflow-y-auto px-4 py-4">
      {recent.length > 0 && (
        <section>
          <SectionTitle title="Önceden gezdiklerim" href="/products" />
          <HScroll>
            {recent.map((item) => {
              const image = item.image ? resolveMediaUrl(item.image) : null;
              return (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={onClose}
                  className="w-[7.5rem] shrink-0"
                >
                  <span className="mb-2 block aspect-square overflow-hidden rounded-lg bg-gray-50">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-gray-300">
                        <Search className="h-5 w-5" />
                      </span>
                    )}
                  </span>
                  <RatingLine rating={item.averageRating} count={item.reviewCount} />
                  <span className="mt-0.5 block text-sm font-semibold text-gray-900">
                    {formatPrice(item.price)}
                  </span>
                </Link>
              );
            })}
          </HScroll>
        </section>
      )}

      {(history.length > 0 || popular.length > 0) && (
        <section>
          {history.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Son aramalar</h3>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Temizle
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onSearch(h)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
          {popular.length > 0 && (
            <>
              <SectionTitle title="Popüler aramalar" />
              <div className="flex flex-wrap gap-1.5">
                {popular.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSearch(p)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {picks.length > 0 && (
        <section>
          <SectionTitle title={pickTitle} href="/products?sort=Rating" />
          <HScroll>
            {picks.map((product) => {
              const image = getImageUrl(product);
              const price = getPrice(product);
              const compare = getCompareAtPrice(product);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={onClose}
                  className="flex w-64 shrink-0 gap-3 rounded-xl border border-gray-100 p-2 hover:border-gray-200 hover:bg-gray-50/70"
                >
                  <span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <Search className="h-5 w-5 text-gray-300" />
                      </span>
                    )}
                    {compare != null && (
                      <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-semibold text-white">
                        İndirim
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 py-0.5">
                    {product.brandName && (
                      <span className="block truncate text-xs font-semibold text-gray-900">
                        {product.brandName}
                      </span>
                    )}
                    <span className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                      {product.name}
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-gray-900">
                      {formatPrice(price)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </HScroll>
        </section>
      )}

      {recent.length === 0 && popular.length === 0 && picks.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">
          Ürün, kategori veya marka arayın
        </p>
      )}
    </div>
  );
}

export function SearchSuggestPanel({
  query,
  rows,
  loading,
  activeIndex,
  listboxId,
  onHover,
  onPick,
  onSearch,
}: {
  query: string;
  rows: SuggestRow[];
  loading: boolean;
  activeIndex: number;
  listboxId: string;
  onHover: (index: number) => void;
  onPick: (row: SuggestRow) => void;
  onSearch: (term: string) => void;
}) {
  if (loading && rows.every((r) => r.kind === "all")) {
    return (
      <p className="px-4 py-6 text-sm text-gray-400">Aranıyor…</p>
    );
  }

  if (!loading && rows.every((r) => r.kind === "all")) {
    return (
      <div className="px-4 py-5">
        <p className="text-sm text-gray-500">Sonuç bulunamadı</p>
        <button
          type="button"
          onClick={() => onSearch(query)}
          className="mt-2 text-sm font-medium text-gray-700 hover:underline"
        >
          “{query}” için tüm ürünleri gör
        </button>
      </div>
    );
  }

  return (
    <ul id={listboxId} role="listbox" className="max-h-[min(70vh,32rem)] overflow-y-auto py-1">
      {rows.map((row, index) => {
        const active = index === activeIndex;
        const rowClass = `flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
          active ? "bg-gray-50" : "hover:bg-gray-50"
        }`;

        if (row.kind === "category") {
          const src = row.item.imageUrl ? resolveMediaUrl(row.item.imageUrl) : null;
          return (
            <li key={row.key} id={`${listboxId}-option-${index}`} role="option" aria-selected={active}>
              <button
                type="button"
                className={rowClass}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
              >
                <Thumb src={src} alt="" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={row.item.name} query={query} />
                </span>
                <span className="shrink-0 text-xs text-gray-400">Kategori</span>
              </button>
            </li>
          );
        }

        if (row.kind === "query") {
          return (
            <li key={row.key} id={`${listboxId}-option-${index}`} role="option" aria-selected={active}>
              <button
                type="button"
                className={rowClass}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
              >
                <Search className="h-4 w-4 shrink-0 text-gray-300" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={row.text} query={query} />
                </span>
              </button>
            </li>
          );
        }

        if (row.kind === "campaign") {
          return (
            <li key={row.key} id={`${listboxId}-option-${index}`} role="option" aria-selected={active}>
              <button
                type="button"
                className={rowClass}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
              >
                <Megaphone className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={row.campaign.name} query={query} />
                </span>
                <span className="shrink-0 text-xs text-gray-400">Kampanya</span>
              </button>
            </li>
          );
        }

        if (row.kind === "brand") {
          const src = row.item.imageUrl ? resolveMediaUrl(row.item.imageUrl) : null;
          return (
            <li key={row.key} id={`${listboxId}-option-${index}`} role="option" aria-selected={active}>
              <button
                type="button"
                className={rowClass}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
              >
                <Thumb src={src} alt="" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  <Highlight text={row.item.name} query={query} />
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-400">
                  <Store className="h-3 w-3" />
                  Marka
                </span>
              </button>
            </li>
          );
        }

        if (row.kind === "product") {
          const image = getImageUrl(row.product);
          return (
            <li key={row.key} id={`${listboxId}-option-${index}`} role="option" aria-selected={active}>
              <button
                type="button"
                className={rowClass}
                onMouseEnter={() => onHover(index)}
                onClick={() => onPick(row)}
              >
                <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Tag className="h-4 w-4 text-gray-300" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1">
                    <Highlight text={row.product.name} query={query} />
                  </span>
                  {row.product.brandName && (
                    <span className="block text-xs text-gray-400">{row.product.brandName}</span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {formatPrice(getPrice(row.product))}
                </span>
              </button>
            </li>
          );
        }

        return (
          <li
            key={row.key}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={active}
            className="border-t border-gray-100"
          >
            <button
              type="button"
              className={`${rowClass} font-medium text-gray-700`}
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(row)}
            >
              Tüm sonuçları gör
              <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
