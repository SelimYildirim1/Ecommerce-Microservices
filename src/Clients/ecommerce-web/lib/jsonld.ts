/** Schema.org JSON-LD yardımcısı — BreadcrumbList / ItemList. */

export type BreadcrumbItem = {
  name: string;
  url?: string;
};

export function breadcrumbJsonLd(
  items: BreadcrumbItem[],
  siteUrl: string,
): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url
        ? {
            item: item.url.startsWith("http")
              ? item.url
              : `${base}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
          }
        : {}),
    })),
  };
}

export type ItemListEntry = {
  name: string;
  url: string;
  image?: string | null;
};

export function itemListJsonLd(
  name: string,
  items: ItemListEntry[],
  siteUrl: string,
): Record<string, unknown> {
  const base = siteUrl.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url.startsWith("http")
        ? item.url
        : `${base}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(data);
}
