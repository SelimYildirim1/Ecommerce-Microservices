"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Grid2X2, List } from "lucide-react";

const PAGE_SIZES = [12, 24, 48];

/** Grid/list ve sayfa başına adet seçicileri. */
export default function ProductViewControls() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const pageSize = Number(searchParams.get("pageSize") || "24");

  const hrefFor = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-border">
        <Link
          href={hrefFor({ view: null })}
          className={`inline-flex h-9 w-9 items-center justify-center ${
            view === "grid" ? "bg-foreground text-white" : "hover:bg-muted"
          }`}
          aria-label="Izgara görünüm"
        >
          <Grid2X2 className="h-4 w-4" />
        </Link>
        <Link
          href={hrefFor({ view: "list" })}
          className={`inline-flex h-9 w-9 items-center justify-center border-l border-border ${
            view === "list" ? "bg-foreground text-white" : "hover:bg-muted"
          }`}
          aria-label="Liste görünüm"
        >
          <List className="h-4 w-4" />
        </Link>
      </div>

      <select
        className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
        value={PAGE_SIZES.includes(pageSize) ? pageSize : 24}
        onChange={(e) => {
          window.location.href = hrefFor({ pageSize: e.target.value });
        }}
        aria-label="Sayfa başına ürün"
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n} / sayfa
          </option>
        ))}
      </select>
    </div>
  );
}
