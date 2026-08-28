"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  clearCompare,
  getCompareItems,
  removeFromCompare,
  type CompareItem,
} from "@/lib/compare";
import { formatPrice, resolveMediaUrl } from "@/lib/catalog";
import { GitCompareArrows, ImageOff, Trash2, X } from "lucide-react";

/** Urun kolonlari icerige gore dar kalir; tablo w-full olmadigi icin
 *  1-2 urunde gorsel ekrani doldurmaz. 390px'te iki kolon yan yana sigar. */
const COL_WIDTH = "w-[140px] min-w-[140px] sm:w-[200px] sm:min-w-[200px]";

const ROWS: {
  key: keyof CompareItem | "priceFormatted";
  label: string;
  render: (item: CompareItem) => React.ReactNode;
}[] = [
  {
    key: "priceFormatted",
    label: "Fiyat",
    render: (item) => (
      <span className="text-base font-semibold">{formatPrice(item.price)}</span>
    ),
  },
  {
    key: "brandName",
    label: "Marka",
    render: (item) => item.brandName || "—",
  },
  {
    key: "categoryName",
    label: "Kategori",
    render: (item) => item.categoryName || "—",
  },
  {
    key: "averageRating",
    label: "Puan",
    render: (item) =>
      item.averageRating != null && item.averageRating > 0
        ? `${item.averageRating.toFixed(1)} / 5`
        : "—",
  },
  {
    key: "stock",
    label: "Stok",
    render: (item) =>
      item.stock != null
        ? item.stock > 0
          ? `${item.stock} adet`
          : "Tükendi"
        : "—",
  },
  {
    key: "description",
    label: "Açıklama",
    render: (item) => (
      <span className="line-clamp-4 text-sm text-muted-foreground">
        {item.description || "—"}
      </span>
    ),
  },
];

export default function ComparePage() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(getCompareItems());
    const sync = () => setItems(getCompareItems());
    window.addEventListener("ys-compare-change", sync);
    return () => window.removeEventListener("ys-compare-change", sync);
  }, []);

  const handleRemove = (id: string) => {
    setItems(removeFromCompare(id));
  };

  const handleClear = () => {
    clearCompare();
    setItems([]);
  };

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 md:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Karşılaştır</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              En fazla 4 ürünü yan yana inceleyin.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
              Listeyi temizle
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <GitCompareArrows className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Karşılaştırma listeniz boş</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ürün kartlarındaki karşılaştır ikonuna tıklayarak ekleyin.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Ürünlere göz at
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-max max-w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-[72px] p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-36 sm:p-4">
                    Özellik
                  </th>
                  {items.map((item) => {
                    const image = item.image ? resolveMediaUrl(item.image) : null;
                    return (
                      <th key={item.id} className={`${COL_WIDTH} p-3 text-left align-top sm:p-4`}>
                        <div className="relative w-fit">
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label={`${item.name} listeden çıkar`}
                            className="absolute -right-1 -top-1 z-10 rounded-full bg-white p-1 text-gray-400 shadow-sm hover:text-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <Link href={`/products/${item.id}`} className="block">
                            <div className="mb-3 flex h-[7.5rem] w-[7.5rem] items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2 sm:h-40 sm:w-40">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={item.name}
                                  loading="lazy"
                                  className="max-h-full max-w-full object-contain object-center"
                                />
                              ) : (
                                <ImageOff className="h-8 w-8 text-gray-300" />
                              )}
                            </div>
                            <span className="line-clamp-2 font-semibold text-gray-900 hover:underline">
                              {item.name}
                            </span>
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="bg-muted/20 p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:p-4">
                      {row.label}
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className={`${COL_WIDTH} p-3 align-top sm:p-4`}>
                        {row.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
