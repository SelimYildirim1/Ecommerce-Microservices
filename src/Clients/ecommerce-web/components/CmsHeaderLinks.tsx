"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

type MenuLink = {
  id: string;
  label: string;
  url?: string | null;
  openInNewTab?: boolean;
};

/** CMS header menüsü; yoksa fallback linkleri gösterir. */
export default function CmsHeaderLinks({
  fallback,
}: {
  fallback: { href: string; label: string }[];
}) {
  const [links, setLinks] = useState<MenuLink[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/catalog/cms/menus/header`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setLinks(items.length > 0 ? items : null);
      })
      .catch(() => {
        if (!cancelled) setLinks(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved =
    links?.map((l) => ({
      href: l.url || "#",
      label: l.label,
      external: Boolean(l.openInNewTab),
    })) ??
    fallback.map((f) => ({ ...f, external: false }));

  return (
    <>
      {resolved.map((link) =>
        link.external ? (
          <a
            key={link.href + link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="hidden transition-colors hover:text-foreground sm:block"
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.href + link.label}
            href={link.href}
            className="hidden transition-colors hover:text-foreground sm:block"
          >
            {link.label}
          </Link>
        ),
      )}
    </>
  );
}
