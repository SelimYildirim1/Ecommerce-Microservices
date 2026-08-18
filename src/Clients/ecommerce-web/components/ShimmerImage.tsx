"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

/** next/image üzerine shimmer iskeleti; görsel gelince kaybolur. */
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
  const loaded = loadedSrc === src;

  return (
    <>
      {!loaded && <div className="shimmer absolute inset-0 z-[1]" aria-hidden />}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        onLoad={() => setLoadedSrc(src)}
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: [
            style?.transform ? "transform 200ms ease" : "transform 500ms ease",
            "opacity 500ms ease",
          ].join(", "),
        }}
      />
    </>
  );
}
