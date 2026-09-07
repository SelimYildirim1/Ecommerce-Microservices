"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import ShimmerImage from "./ShimmerImage";

const SWIPE_PX = 40;

function canHoverScrub() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Çoklu görsel: masaüstünde hover ile tarama, mobilde kaydırma. Ok yok. */
export default function ProductCardGallery({
  urls,
  alt,
  href,
  priority = false,
}: {
  urls: string[];
  alt: string;
  href: string;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const didSwipe = useRef(false);
  const total = urls.length;

  const go = useCallback(
    (dir: number) => {
      if (total < 2) return;
      setIndex((i) => (i + dir + total) % total);
    },
    [total],
  );

  const scrubTo = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const i = Math.floor(((clientX - rect.left) / rect.width) * total);
    setIndex(Math.max(0, Math.min(total - 1, i)));
  };

  if (total === 0) {
    return (
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-gray-50">
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-10 w-10 text-gray-300" />
        </div>
      </Link>
    );
  }

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden bg-gray-50 touch-pan-y"
      onMouseMove={(e) => {
        if (total < 2 || !canHoverScrub() || e.buttons !== 0) return;
        scrubTo(e.clientX, e.currentTarget);
      }}
      onPointerDown={(e) => {
        if (total < 2 || e.button !== 0) return;
        startX.current = e.clientX;
        startY.current = e.clientY;
        axis.current = null;
        didSwipe.current = false;
      }}
      onPointerMove={(e) => {
        if (total < 2 || e.buttons === 0) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (!axis.current) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }
        if (axis.current === "h" && Math.abs(dx) > 8) didSwipe.current = true;
      }}
      onPointerUp={(e) => {
        if (total < 2 || axis.current !== "h") {
          axis.current = null;
          return;
        }
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
        axis.current = null;
      }}
      onClickCapture={(e) => {
        if (!didSwipe.current) return;
        e.preventDefault();
        e.stopPropagation();
        didSwipe.current = false;
      }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${-index * 100}%)` }}
      >
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="relative h-full min-w-full shrink-0">
            <ShimmerImage
              src={url}
              alt={i === index ? alt : ""}
              priority={priority && i === 0}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="pointer-events-none select-none object-cover group-hover:scale-105"
            />
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="absolute inset-0 z-[1]"
        aria-label={alt}
        draggable={false}
      />

      {total > 1 && (
        <div
          className="pointer-events-none absolute bottom-2 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-1"
          aria-hidden
        >
          {urls.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full shadow-sm transition ${
                i === index ? "scale-125 bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
