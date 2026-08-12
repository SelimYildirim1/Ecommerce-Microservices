"use client";

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import ProductFilters from "./ProductFilters";
import type { ProductFacets } from "@/lib/catalog";

/** Mobilde filtreleri sheet olarak açar. */
export default function MobileFilterDrawer({ facets }: { facets: ProductFacets }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium lg:hidden"
      >
        <Filter className="h-4 w-4" />
        Filtrele
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider">Filtreler</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ProductFilters facets={facets} />
            </div>
            <div className="border-t border-border p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-white"
              >
                Sonuçları göster
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
