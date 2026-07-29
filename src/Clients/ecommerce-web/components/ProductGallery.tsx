"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { resolveMediaUrl, type ProductImage } from "@/lib/catalog";

interface Props {
  images: ProductImage[];
  fallbackUrl: string | null;
  alt: string;
}

/** Coklu gorsel galerisi. Tek gorsel varsa kucuk resimler gizlenir. */
export default function ProductGallery({ images, fallbackUrl, alt }: Props) {
  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });

  const urls = sorted.length > 0
    ? sorted.map((i) => resolveMediaUrl(i.url))
    : fallbackUrl
      ? [fallbackUrl]
      : [];

  const [active, setActive] = useState(0);
  const current = urls[active] ?? null;

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
        {current ? (
          <img src={current} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <ImageOff className="h-14 w-14 text-gray-300" />
            <span className="text-sm text-gray-400">Görsel mevcut değil</span>
          </div>
        )}
      </div>

      {urls.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {urls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              onClick={() => setActive(index)}
              aria-label={`${index + 1}. görsel`}
              className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition
                ${index === active ? "border-foreground" : "border-gray-100 hover:border-gray-300"}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
