import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  /** Sayfa disindaki mevcut sorgu parametreleri. */
  params: Record<string, string>;
  basePath?: string;
  /** blog: yuvarlak kurumsal stil */
  variant?: "default" | "blog";
}

/**
 * Sayfa numaralarini link olarak uretir; sunucu bileseni oldugu icin
 * JavaScript kapaliyken de calisir.
 */
export default function Pagination({
  page,
  totalPages,
  params,
  basePath = "/products",
  variant = "default",
}: Props) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams(params);
    if (target > 1) search.set("page", String(target));
    else search.delete("page");

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  if (variant === "blog") {
    return (
      <nav
        className="mt-10 flex flex-wrap items-center justify-center gap-2"
        aria-label="Sayfalama"
      >
        <BlogNavLink href={href(page - 1)} disabled={page <= 1} ariaLabel="Önceki">
          <ChevronLeft className="h-4 w-4" />
        </BlogNavLink>

        {buildPageList(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={href(item)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition ${
                item === page
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-border bg-white text-foreground/80 hover:border-foreground hover:text-foreground"
              }`}
            >
              {item}
            </Link>
          ),
        )}

        <BlogNavLink href={href(page + 1)} disabled={page >= totalPages} ariaLabel="Sonraki">
          <ChevronRight className="h-4 w-4" />
        </BlogNavLink>
      </nav>
    );
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Sayfalama">
      <PageLink href={href(page - 1)} disabled={page <= 1} label="Önceki" />

      {buildPageList(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${
              item === page
                ? "border-foreground bg-foreground text-white"
                : "border-border hover:bg-muted"
            }`}
          >
            {item}
          </Link>
        ),
      )}

      <PageLink href={href(page + 1)} disabled={page >= totalPages} label="Sonraki" />
    </nav>
  );
}

function BlogNavLink({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  disabled: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={ariaLabel}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground/40"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-foreground/80 transition hover:border-foreground hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span className="flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground/50">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="flex h-9 items-center rounded-md border border-border px-3 text-sm transition hover:bg-muted"
    >
      {label}
    </Link>
  );
}

/** Bas, son ve gecerli sayfanin cevresini gosterir; arasi "..." ile atlanir. */
function buildPageList(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("gap");
    result.push(value);
  });

  return result;
}
