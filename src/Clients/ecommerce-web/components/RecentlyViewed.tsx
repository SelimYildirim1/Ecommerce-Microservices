"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import ShimmerImage from "./ShimmerImage";
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/recently-viewed";
import { formatPrice, resolveMediaUrl } from "@/lib/catalog";

interface Props {
  /** Detay sayfasında mevcut ürünü listeden çıkarır. */
  excludeId?: string;
}

const SCROLL_HIDE =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/** Yatay son görüntülenen ürün şeridi; taşınca oklarla kaydırılır. */
export default function RecentlyViewed({ excludeId }: Props) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = getRecentlyViewed().filter((p) => p.id !== excludeId);
    setItems(list);
  }, [excludeId]);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 8;
    setCanPrev(overflow && el.scrollLeft > 4);
    setCanNext(overflow && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || items.length === 0) return;

    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [items, updateArrows]);

  const scrollByDir = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.round(el.clientWidth * 0.7);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const showArrows = canPrev || canNext;

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 md:px-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Son Görüntülenenler</h2>
        {showArrows && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Öncekileri göster"
              disabled={!canPrev}
              onClick={() => scrollByDir(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Sonrakileri göster"
              disabled={!canNext}
              onClick={() => scrollByDir(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className={`flex gap-4 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-1 ${SCROLL_HIDE}`}
        >
          {items.map((item) => {
            const image = item.image ? resolveMediaUrl(item.image) : null;

            return (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="group w-40 shrink-0 sm:w-44"
              >
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-gray-50">
                  {image ? (
                    <ShimmerImage
                      src={image}
                      alt={item.name}
                      sizes="176px"
                      className="object-cover group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:underline">
                  {item.name}
                </p>
                <p className="mt-1 text-sm font-semibold">{formatPrice(item.price)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
