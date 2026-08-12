"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { getCompareItems } from "@/lib/compare";

/** Header/footer için karşılaştırma linki + sayı rozeti. */
export default function CompareNavLink({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setCount(getCompareItems().length);
    sync();
    window.addEventListener("ys-compare-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ys-compare-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  return (
    <Link
      href="/karsilastir"
      title="Karşılaştır"
      aria-label={`Karşılaştır${count > 0 ? `, ${count}` : ""}`}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      <span className="relative">
        <GitCompareArrows className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {showLabel && <span className="sr-only">Karşılaştır</span>}
    </Link>
  );
}
