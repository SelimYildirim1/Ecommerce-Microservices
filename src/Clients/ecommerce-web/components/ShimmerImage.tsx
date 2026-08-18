"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const MIN_SHIMMER_MS = 700;

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
  const shownAt = useRef(Date.now());
  const timer = useRef<number | undefined>(undefined);
  const loaded = loadedSrc === src;

  useEffect(() => {
    shownAt.current = Date.now();
    setLoadedSrc(null);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [src]);

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 z-[1] overflow-hidden bg-[#d4d4d4]" aria-hidden>
          <span className="shimmer-wave" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        onLoad={() => {
          const wait = Math.max(0, MIN_SHIMMER_MS - (Date.now() - shownAt.current));
          timer.current = window.setTimeout(() => setLoadedSrc(src), wait);
        }}
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
