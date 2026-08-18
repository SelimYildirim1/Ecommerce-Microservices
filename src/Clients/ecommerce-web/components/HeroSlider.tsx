"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
}

const AUTOPLAY_MS = 6000;

/**
 * Ana sayfa hero alani. Panelden gelen bannerlari sirayla gosterir;
 * tek banner varsa oklar gizlenir ve otomatik gecis durur.
 * Performans: yalnizca aktif + komsu slayt gorselleri yuklenir.
 */
export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const total = slides.length;

  useEffect(() => {
    if (total < 2) return;

    const timer = setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [total, index]);

  useEffect(() => {
    if (total === 0) return;
    const neighbors = [
      index,
      (index + 1) % total,
      (index - 1 + total) % total,
    ];
    setLoaded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const i of neighbors) {
        if (!next.has(i)) {
          next.add(i);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [index, total]);

  if (total === 0) return null;

  const active = slides[Math.min(index, total - 1)];

  return (
    <section className="relative flex h-[62vh] min-h-[460px] w-full items-center overflow-hidden bg-cream">
      {slides.map((slide, i) => {
        if (!loaded.has(i)) return null;
        return (
          <div
            key={slide.id}
            aria-hidden={i !== index}
            className={`absolute inset-0 z-0 transition-opacity duration-700 ${
              i === index ? "opacity-90" : "opacity-0"
            }`}
          >
            <Image
              src={slide.imageUrl}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-right"
            />
          </div>
        );
      })}

      <div className="absolute inset-0 z-10 w-full bg-gradient-to-r from-white via-white/85 to-transparent md:w-3/4 lg:w-2/3" />

      <div className="relative z-20 mx-auto w-full max-w-[1600px] px-6 md:px-12">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Yıldırım Store
          </p>

          <h1 className="font-display mb-6 text-5xl font-bold leading-tight text-gray-900 md:text-7xl">
            {active.title}
          </h1>

          {active.subtitle && (
            <p className="mb-8 max-w-md text-lg leading-relaxed text-gray-600">
              {active.subtitle}
            </p>
          )}

          <Link
            href={active.linkUrl || "/products"}
            className="group inline-flex items-center gap-3 rounded-lg bg-foreground px-8 py-4 font-medium text-white transition-colors hover:bg-gray-800"
          >
            Alışverişe Başla
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {total > 1 && (
          <div
            className="mt-12 flex items-center gap-2"
            role="tablist"
            aria-label="Banner slaytları"
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
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-8 bg-foreground"
                      : "w-2.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
