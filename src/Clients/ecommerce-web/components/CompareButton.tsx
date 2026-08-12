"use client";

import { GitCompareArrows } from "lucide-react";
import {
  COMPARE_MAX,
  isInCompare,
  toggleCompare,
  type CompareItem,
} from "@/lib/compare";
import { notify } from "@/lib/feedback";
import { useEffect, useState } from "react";

interface Props {
  product: CompareItem;
  /** Kart üzerinde küçük ikon veya satır içi buton. */
  variant?: "overlay" | "inline";
}

export default function CompareButton({ product, variant = "overlay" }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isInCompare(product.id));

    const sync = () => setActive(isInCompare(product.id));
    window.addEventListener("ys-compare-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ys-compare-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = toggleCompare(product);

    if (result.full) {
      notify.error(`En fazla ${COMPARE_MAX} ürün karşılaştırabilirsiniz.`);
      return;
    }

    setActive(result.added);
    if (result.added) {
      notify.success("Karşılaştırma listesine eklendi.");
    } else {
      notify.success("Karşılaştırma listesinden çıkarıldı.");
    }
  };

  const label = active ? "Karşılaştırmadan çıkar" : "Karşılaştır";

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        title={label}
        className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition
          ${active
            ? "border-foreground bg-foreground text-white"
            : "border-border text-foreground hover:bg-muted"
          }`}
      >
        <GitCompareArrows className="h-4 w-4" />
        {active ? "Karşılaştırmada" : "Karşılaştır"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full
        bg-white shadow-sm transition-transform hover:scale-110
        ${active ? "text-foreground" : "text-gray-400"}`}
    >
      <GitCompareArrows className="h-4 w-4" />
    </button>
  );
}
