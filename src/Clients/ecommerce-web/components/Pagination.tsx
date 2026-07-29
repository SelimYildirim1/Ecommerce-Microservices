import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  /** Sayfa disindaki mevcut sorgu parametreleri. */
  params: Record<string, string>;
  basePath?: string;
}

/**
 * Sayfa numaralarini link olarak uretir; sunucu bileseni oldugu icin
 * JavaScript kapaliyken de calisir.
 */
export default function Pagination({ page, totalPages, params, basePath = "/products" }: Props) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams(params);
    if (target > 1) search.set("page", String(target));
    else search.delete("page");

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Sayfalama">
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
            className={`min-w-9 h-9 px-3 rounded-md border text-sm font-medium flex items-center justify-center transition
              ${item === page
                ? "bg-foreground text-white border-foreground"
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

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span className="h-9 px-3 rounded-md border border-border text-sm flex items-center text-muted-foreground/50">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="h-9 px-3 rounded-md border border-border text-sm flex items-center hover:bg-muted transition"
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
