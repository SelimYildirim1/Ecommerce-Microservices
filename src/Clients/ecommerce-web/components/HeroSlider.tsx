"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export interface HeroSlide {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
}

export type HeroVariant = "desktop" | "mobile";

const AUTOPLAY_MS = 5000;
const SWIPE_PX = 48;

/**
 * Görsel indirmesini görünen kırılıma sınırlar: gizli varyantta tarayıcı
 * srcset'ten en küçük adayı seçer, böylece mobilde masaüstü görseli inmez.
 */
const VARIANT_SIZES: Record<HeroVariant, string> = {
  desktop: "(max-width: 767px) 1px, 100vw",
  mobile: "(min-width: 768px) 1px, 100vw",
};

/** Mobil banner tasarım ölçüsü 390×523; yüksekliği genişlikten türetilir. */
const VARIANT_FRAME: Record<HeroVariant, string> = {
  desktop: "h-[62vh] min-h-[460px]",
  mobile: "aspect-[390/523] max-h-[78vh]",
};

/**
 * Ana sayfa hero: panelden gelen görseller. Başlık/slogan/CTA boşsa yazı
 * görselin içinde kabul edilir. Birden fazla slaytta 5 sn otomatik kayar;
 * parmak / fare ile kaydırılabilir.
 */
export default function HeroSlider({
  slides,
  variant = "desktop",
}: {
  slides: HeroSlide[];
  variant?: HeroVariant;
}) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const total = slides.length;

  const wrapRef = useRef<HTMLElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const didSwipe = useRef(false);
  const dragXRef = useRef(0);

  const goBy = useCallback(
    (dir: number) => {
      if (total < 2 || dir === 0) return;
      setIndex((i) => (i + dir + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total < 2 || dragging) return;
    const timer = setInterval(() => goBy(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [total, index, dragging, goBy]);

  /** Mac trackpad iki parmak yatay kaydırma `wheel` üretir; sürükleme değil. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || total < 2) return;

    let lockedUntil = 0;
    let acc = 0;
    let idle: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (e: WheelEvent) => {
      if (dragging) return;
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 800 : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;

      e.preventDefault();
      acc += dx;

      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        acc = 0;
      }, 80);

      const now = Date.now();
      if (now < lockedUntil) return;
      if (Math.abs(acc) < 36) return;

      goBy(acc > 0 ? 1 : -1);
      acc = 0;
      lockedUntil = now + 520;
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      if (idle) clearTimeout(idle);
    };
  }, [total, dragging, goBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (total < 2 || e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = null;
    didSwipe.current = false;
    dragXRef.current = 0;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || total < 2) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") return;
    }
    if (axis.current !== "h") return;

    e.preventDefault();
    dragXRef.current = dx;
    didSwipe.current = Math.abs(dx) > 8;
    setDragX(dx);
  };

  const finishDrag = (pointerId: number, target: HTMLElement) => {
    if (!dragging) return;
    const dx = dragXRef.current;
    const width = wrapRef.current?.offsetWidth ?? 1;
    const threshold = Math.max(SWIPE_PX, width * 0.15);

    if (axis.current === "h" && Math.abs(dx) >= threshold) {
      goBy(dx < 0 ? 1 : -1);
    }

    dragXRef.current = 0;
    axis.current = null;
    setDragX(0);
    setDragging(false);
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      /* zaten bırakılmış olabilir */
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    finishDrag(e.pointerId, e.currentTarget as HTMLElement);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!didSwipe.current) return;
    e.preventDefault();
    e.stopPropagation();
    didSwipe.current = false;
  };

  if (total === 0) return null;

  const active = slides[Math.min(index, total - 1)];
  const href = active.linkUrl?.trim() || null;
  const trackStyle = {
    transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
  };

  const hasOverlay = Boolean(
    active.title?.trim() || active.subtitle?.trim() || active.ctaText?.trim(),
  );

  return (
    <section
      ref={wrapRef}
      className={`relative w-full max-w-full overflow-hidden overscroll-x-contain bg-cream touch-pan-y ${VARIANT_FRAME[variant]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <div
        className={`flex h-full ${dragging ? "" : "transition-transform duration-500 ease-out"}`}
        style={trackStyle}
      >
        {slides.map((slide, i) => (
          <div key={slide.id} className="relative h-full min-w-full shrink-0">
            <Image
              src={slide.imageUrl}
              alt=""
              fill
              priority={i === 0}
              draggable={false}
              sizes={VARIANT_SIZES[variant]}
              className="pointer-events-none select-none object-cover object-center"
            />
          </div>
        ))}
      </div>

      {hasOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-5 pb-16 pt-16 text-white">
          {active.title?.trim() && (
            <h2 className="font-display text-2xl leading-tight font-semibold text-balance">
              {active.title}
            </h2>
          )}
          {active.subtitle?.trim() && (
            <p className="text-sm leading-snug text-white/85">{active.subtitle}</p>
          )}
          {active.ctaText?.trim() && (
            <span className="mt-1 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-900">
              {active.ctaText}
            </span>
          )}
        </div>
      )}

      {href &&
        (/^https?:\/\//i.test(href) ? (
          <a
            href={href}
            className="absolute inset-0 z-20 touch-pan-y"
            aria-label="Banner bağlantısı"
            draggable={false}
          />
        ) : (
          <Link
            href={href}
            className="absolute inset-0 z-20 touch-pan-y"
            aria-label="Banner bağlantısı"
            draggable={false}
          />
        ))}

      {total > 1 && (
        <div
          className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-2 py-1.5 backdrop-blur-sm md:bottom-8"
          role="tablist"
          aria-label="Banner slaytları"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {slides.map((slide, i) => {
            const isActive = i === index;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${i + 1}. slayt`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`relative h-2.5 overflow-hidden rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-8 bg-white/40"
                    : "w-2.5 bg-white/40 hover:bg-white/60"
                }`}
              >
                {isActive && !dragging && (
                  <span
                    key={index}
                    className="hero-progress absolute inset-0 origin-left rounded-full bg-white"
                    style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
