"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Header arama kutusu. Aramayi /products sayfasina q parametresiyle tasir. */
export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState("");

  // Liste sayfasindayken kutuyu aktif arama ile senkron tut
  useEffect(() => {
    setTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = term.trim();
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : "/products");
  };

  return (
    <form onSubmit={submit} className={`relative w-full ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Ürün, kategori veya marka ara..."
        aria-label="Ürün ara"
        className="h-11 w-full rounded-lg border-none bg-gray-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:ring-1 focus:ring-gray-200"
      />
    </form>
  );
}
