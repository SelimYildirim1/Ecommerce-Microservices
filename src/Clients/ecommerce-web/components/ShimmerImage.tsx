"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/** Anlık yüklenen görsellerde titremeyi önleyen en kısa shimmer süresi. */
const MIN_SHIMMER_MS = 700;

/**
 * Görsel hiç yüklenmezse (404, ağ hatası, kaçırılan onLoad) shimmer sonsuza
 * kadar kalmasın diye üst sınır.
 */
const MAX_SHIMMER_MS = 5000;

/** next/image üzerine soldan sağa akan shimmer; görsel gelince kaybolur. */
export default function ShimmerImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  style,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const shownAt = useRef(Date.now());
  const timers = useRef<number[]>([]);
  const loaded = loadedSrc === src;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  /** Shimmer'ı kaldırır; `immediate` önbellekten gelen görselde titremeyi önler. */
  const reveal = useCallback(
    (target: string, immediate = false) => {
      if (immediate) {
        setLoadedSrc(target);
        return;
      }
      const wait = Math.max(0, MIN_SHIMMER_MS - (Date.now() - shownAt.current));
      if (wait === 0) {
        setLoadedSrc(target);
        return;
      }
      timers.current.push(window.setTimeout(() => setLoadedSrc(target), wait));
    },
    [],
  );

  useEffect(() => {
    shownAt.current = Date.now();
    clearTimers();
    setLoadedSrc(null);

    // Görsel hydration'dan önce tamamlandıysa onLoad tetiklenmez; elle kontrol et.
    const node = imgRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      setLoadedSrc(src);
      return clearTimers;
    }

    // Son güvenlik ağı: hiçbir olay gelmezse shimmer'ı yine de kaldır.
    timers.current.push(
      window.setTimeout(() => setLoadedSrc(src), MAX_SHIMMER_MS),
    );

    return clearTimers;
  }, [src, clearTimers, reveal]);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 z-[1] overflow-hidden bg-[#d4d4d4]" aria-hidden>
          <span className="shimmer-wave" />
        </div>
      )}
      <Image
        ref={imgRef}
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        onLoad={() => reveal(src)}
        onError={() => reveal(src, true)}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: [
            style?.transform ? "transform 200ms ease" : "transform 500ms ease",
            "opacity 400ms ease",
          ].join(", "),
        }}
      />
    </>
  );
}
