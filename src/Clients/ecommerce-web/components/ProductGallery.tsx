"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Play, X, ZoomIn } from "lucide-react";
import { resolveMediaUrl, type ProductImage } from "@/lib/catalog";
import ShimmerImage from "./ShimmerImage";

interface Props {
  images: ProductImage[];
  fallbackUrl: string | null;
  alt: string;
}

type GalleryItem = {
  url: string;
  mediaType: string;
};

/** Çoklu görsel/video galerisi: hover zoom + lightbox. */
export default function ProductGallery({ images, fallbackUrl, alt }: Props) {
  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });

  const items: GalleryItem[] =
    sorted.length > 0
      ? sorted.map((i) => ({
          url: resolveMediaUrl(i.url),
          mediaType: i.mediaType || "image",
        }))
      : fallbackUrl
        ? [{ url: fallbackUrl, mediaType: "image" }]
        : [];

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState({ x: 50, y: 50, on: false });
  const stageRef = useRef<HTMLDivElement>(null);

  const current = items[active] ?? null;
  const isVideo = current?.mediaType === "video";

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % Math.max(items.length, 1));
      if (e.key === "ArrowLeft")
        setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, items.length]);

  const zoomStyle = useMemo(() => {
    if (!zoom.on || isVideo || !current) return undefined;
    return {
      transformOrigin: `${zoom.x}% ${zoom.y}%`,
      transform: "scale(1.8)",
    } as React.CSSProperties;
  }, [zoom, isVideo, current]);

  const onMove = (e: React.MouseEvent) => {
    if (!stageRef.current || isVideo) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ x, y, on: true });
  };

  return (
    <div className="space-y-3">
      <div
        ref={stageRef}
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
      >
        {current ? (
          isVideo ? (
            <video
              src={current.url}
              controls
              className="h-full w-full object-cover"
              poster={items.find((i) => i.mediaType === "image")?.url}
            />
          ) : (
            <ShimmerImage
              src={current.url}
              alt={alt}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              style={zoomStyle}
              priority
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <ImageOff className="h-14 w-14 text-gray-300" />
            <span className="text-sm text-gray-400">Görsel mevcut değil</span>
          </div>
        )}

        {current && !isVideo && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 opacity-0 shadow-sm transition group-hover:opacity-100"
          >
            <ZoomIn className="h-3.5 w-3.5" />
            Büyüt
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1">
          {items.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              onClick={() => setActive(index)}
              aria-label={`${index + 1}. medya`}
              className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition
                ${index === active ? "border-foreground" : "border-gray-100 hover:border-gray-300"}`}
            >
              {item.mediaType === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                  <Play className="h-5 w-5 text-gray-500" />
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && current && !isVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Kapat"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-[90vh] w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.url}
              alt={alt}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
