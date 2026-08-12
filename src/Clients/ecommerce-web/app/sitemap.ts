import type { MetadataRoute } from "next";
import { INTERNAL_API_URL, API_URL } from "@/lib/api";

async function fetchJson<T>(path: string): Promise<T | null> {
  const bases = [INTERNAL_API_URL, API_URL];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) return (await res.json()) as T;
    } catch {
      /* sonraki base */
    }
  }
  return null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/iletisim`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sss`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const extra: MetadataRoute.Sitemap = [];

  try {
    const productsData = await fetchJson<
      | { items?: Array<{ id: string; updatedAt?: string }> }
      | Array<{ id: string; updatedAt?: string }>
    >("/catalog/products?pageSize=100");

    const products = Array.isArray(productsData)
      ? productsData
      : productsData?.items ?? [];

    for (const p of products) {
      if (!p?.id) continue;
      extra.push({
        url: `${base}/products/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    /* ürün sitemap opsiyonel */
  }

  try {
    const categories =
      (await fetchJson<
        Array<{ slug?: string | null; id: string }>
      >("/catalog/categories")) ?? [];

    for (const c of categories) {
      if (c.slug) {
        extra.push({
          url: `${base}/kategori/${c.slug}`,
          changeFrequency: "weekly",
          priority: 0.75,
        });
      }
    }
  } catch {
    /* kategori sitemap opsiyonel */
  }

  try {
    const pages =
      (await fetchJson<Array<{ slug: string }>>("/catalog/cms/pages")) ?? [];

    for (const page of pages) {
      if (!page?.slug) continue;
      extra.push({
        url: `${base}/pages/${page.slug}`,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  } catch {
    /* CMS sitemap opsiyonel */
  }

  try {
    const blog =
      (await fetchJson<{
        items?: Array<{ slug: string; publishedAt?: string }>;
      }>("/catalog/blog/posts?pageSize=100")) ?? { items: [] };

    for (const post of blog.items ?? []) {
      if (!post?.slug) continue;
      extra.push({
        url: `${base}/blog/${post.slug}`,
        lastModified: post.publishedAt
          ? new Date(post.publishedAt)
          : undefined,
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }

    const blogCats =
      (await fetchJson<Array<{ slug: string }>>("/catalog/blog/categories")) ??
      [];
    for (const c of blogCats) {
      extra.push({
        url: `${base}/blog/kategori/${c.slug}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }

    const blogTags =
      (await fetchJson<Array<{ slug: string }>>("/catalog/blog/tags")) ?? [];
    for (const t of blogTags) {
      extra.push({
        url: `${base}/blog/etiket/${t.slug}`,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  } catch {
    /* blog sitemap opsiyonel */
  }

  // Sabit yasal sayfalar (CMS’de yoksa bile)
  const legalFallback = [
    "kvkk",
    "cerez-politikasi",
    "mesafeli-satis-sozlesmesi",
  ];
  const existingPageUrls = new Set(extra.map((r) => r.url));
  for (const slug of legalFallback) {
    const url = `${base}/pages/${slug}`;
    if (!existingPageUrls.has(url)) {
      extra.push({
        url,
        changeFrequency: "yearly",
        priority: 0.3,
      });
    }
  }

  return [...staticRoutes, ...extra];
}
