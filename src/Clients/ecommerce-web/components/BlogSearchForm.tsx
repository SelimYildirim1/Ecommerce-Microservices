"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  initialQuery?: string;
  basePath?: string;
}

export default function BlogSearchForm({
  initialQuery = "",
  basePath = "/blog",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    const params = new URLSearchParams();
    if (term) params.set("q", term);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <form onSubmit={submit} className="relative">
      <label htmlFor="blog-search" className="sr-only">
        Blogda ara
      </label>
      <input
        id="blog-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ARA..."
        className="h-12 w-full rounded-xl border border-border bg-white pl-4 pr-12 text-sm uppercase tracking-wide text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Ara"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
