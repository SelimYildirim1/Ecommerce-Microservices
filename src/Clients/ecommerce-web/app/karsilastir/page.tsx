"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  clearCompare,
  COMPARE_MAX,
  getCompareItems,
  removeFromCompare,
  type CompareItem,
} from "@/lib/compare";
import { formatPrice, resolveMediaUrl } from "@/lib/catalog";
import { GitCompareArrows, ImageOff, Trash2, X } from "lucide-react";

/** Urun kolonlari, kac urun olursa olsun ayni genislikte kalir.
 *  Mobilde 180px: etiket kolonuyla birlikte ekrana sigar. */
const COL_WIDTH = "w-[180px] min-w-[180px] sm:w-[220px] sm:min-w-[200px]";

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

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-12">
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
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-36 p-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Özellik
                  </th>
                  {items.map((item) => {
                    const image = item.image ? resolveMediaUrl(item.image) : null;
                    return (
                      <th key={item.id} className={`${COL_WIDTH} p-4 text-left align-top`}>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            aria-label={`${item.name} listeden çıkar`}
                            className="absolute -right-1 -top-1 rounded-full bg-white p-1 text-gray-400 shadow-sm hover:text-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <Link href={`/products/${item.id}`} className="block">
                            {/* Karsilastirmada urunun tamami gorunmeli:
                                object-contain ile kirpilmadan kareye ortalanir. */}
                            <div className="mb-3 flex aspect-square w-full max-w-[200px] items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={item.name}
                                  loading="lazy"
                                  className="max-h-full max-w-full object-contain"
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
                  {/* Artan genisligi emer; boylece az urunde kolonlar
                      buyuyup gorsel gereksiz sisemez. */}
                  {items.length < COMPARE_MAX && <th aria-hidden className="w-auto p-0" />}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <td className="bg-muted/20 p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-4 align-top">
                        {row.render(item)}
                      </td>
                    ))}
                    {items.length < COMPARE_MAX && <td aria-hidden className="p-0" />}
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
