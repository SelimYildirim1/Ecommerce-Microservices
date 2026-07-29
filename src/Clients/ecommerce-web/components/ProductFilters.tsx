"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SORT_OPTIONS, formatPrice, type ProductFacets } from "@/lib/catalog";

/**
 * Filtre paneli. Tum durum URL'de tutulur; boylece sonuc sayfasi
 * paylasilabilir ve geri tusu beklendigi gibi calisir.
 */
export default function ProductFilters({ facets }: { facets: ProductFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("category");
  const brandId = searchParams.get("brand");
  const inStock = searchParams.get("inStock") === "true";

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  useEffect(() => {
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
  }, [searchParams]);

  /** Filtre degisince sayfa 1'e doner; aksi halde bos sonuc gorunur. */
  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }

      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const hasActiveFilter =
    Boolean(categoryId || brandId || inStock) ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice");

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6">
      {hasActiveFilter && (
        <button
          onClick={() =>
            apply({
              category: null,
              brand: null,
              minPrice: null,
              maxPrice: null,
              inStock: null,
            })
          }
          className="w-full rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:border-foreground hover:bg-muted"
        >
          Filtreleri temizle
        </button>
      )}

      <FilterGroup title="Kategori">
        <FilterOption
          label="Tümü"
          active={!categoryId}
          onClick={() => apply({ category: null })}
        />
        {facets.categories.map((c) => (
          <FilterOption
            key={c.id}
            label={c.name}
            count={c.count}
            active={categoryId === c.id}
            onClick={() => apply({ category: categoryId === c.id ? null : c.id })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Marka">
        <FilterOption
          label="Tümü"
          active={!brandId}
          onClick={() => apply({ brand: null })}
        />
        {facets.brands.map((b) => (
          <FilterOption
            key={b.id}
            label={b.name}
            count={b.count}
            active={brandId === b.id}
            onClick={() => apply({ brand: brandId === b.id ? null : b.id })}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Fiyat aralığı">
        <p className="text-xs text-muted-foreground mb-2">
          {formatPrice(facets.minPrice)} - {formatPrice(facets.maxPrice)}
        </p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ minPrice: minPrice || null, maxPrice: maxPrice || null });
          }}
        >
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            aria-label="En düşük fiyat"
            className="w-full h-9 px-2 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            aria-label="En yüksek fiyat"
            className="w-full h-9 px-2 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
          />
          <button
            type="submit"
            className="h-9 px-3 rounded-md bg-foreground text-white text-xs font-medium hover:bg-foreground/85 transition shrink-0"
          >
            Uygula
          </button>
        </form>
      </FilterGroup>

      <FilterGroup title="Stok">
        <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => apply({ inStock: e.target.checked ? "true" : null })}
            className="w-4 h-4 rounded border-border"
          />
          Sadece stokta olanlar
        </label>
      </FilterGroup>
    </aside>
  );
}

/** Siralama secici; liste basliginda filtre panelinden ayri durur. */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("sort") ?? "Newest";

  return (
    <select
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", e.target.value);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      }}
      aria-label="Sıralama"
      className="h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-foreground focus:outline-none"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="space-y-0.5 max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition
        ${active ? "bg-foreground font-medium text-white" : "hover:bg-muted"}`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs shrink-0 ${active ? "text-white/70" : "text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
