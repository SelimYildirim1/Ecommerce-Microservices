"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import SectionHeader from "./SectionHeader";
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

/** Yatay son görüntülenen ürün şeridi. */
export default function RecentlyViewed({ excludeId }: Props) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    const list = getRecentlyViewed().filter((p) => p.id !== excludeId);
    setItems(list);
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-6 py-12 md:px-12">
      <SectionHeader title="Son Görüntülenenler" />

      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 pt-1">
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
    </section>
  );
}
