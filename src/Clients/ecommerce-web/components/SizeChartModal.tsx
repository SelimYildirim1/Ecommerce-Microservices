"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Ruler, X } from "lucide-react";

const CLOTHING_ROWS = [
  { size: "XS", chest: "82–86", waist: "66–70", hip: "90–94" },
  { size: "S", chest: "86–90", waist: "70–74", hip: "94–98" },
  { size: "M", chest: "90–94", waist: "74–78", hip: "98–102" },
  { size: "L", chest: "94–100", waist: "78–84", hip: "102–108" },
  { size: "XL", chest: "100–106", waist: "84–90", hip: "108–114" },
  { size: "XXL", chest: "106–112", waist: "90–96", hip: "114–120" },
];

/** Statik beden tablosu modalı (gövde ölçüleri cm). */
export default function SizeChartModal() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        <Ruler className="h-3.5 w-3.5" />
        Beden tablosu
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id={titleId} className="text-base font-semibold">
                Beden tablosu
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="rounded-lg p-2 text-gray-500 hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="mb-4 text-sm text-muted-foreground">
                Ölçüler santimetre (cm) cinsindendir. En doğru sonuç için vücut
                ölçülerinizi bir mezura ile alın.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-semibold">Beden</th>
                      <th className="pb-2 pr-3 font-semibold">Göğüs</th>
                      <th className="pb-2 pr-3 font-semibold">Bel</th>
                      <th className="pb-2 font-semibold">Kalça</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLOTHING_ROWS.map((row) => (
                      <tr key={row.size} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-semibold">{row.size}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.chest}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.waist}</td>
                        <td className="py-2.5 text-muted-foreground">{row.hip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Varyantlarda beden / numara varsa true. */
export function hasSizeLikeAttributes(
  variants: { specifics?: Record<string, unknown> | null }[] | null | undefined,
): boolean {
  const keys = new Set(["size", "shoe_size", "beden", "numara"]);
  for (const v of variants ?? []) {
    if (!v.specifics) continue;
    for (const key of Object.keys(v.specifics)) {
      if (keys.has(key.toLowerCase())) return true;
    }
  }
  return false;
}
