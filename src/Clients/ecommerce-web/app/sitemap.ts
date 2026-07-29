import type { MetadataRoute } from "next";
import { API_URL } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pages/kvkk`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/pages/cerez-politikasi`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/pages/mesafeli-satis-sozlesmesi`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const res = await fetch(`${API_URL}/catalog/products?pageSize=100`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return staticRoutes;
    const data = await res.json();
    const products = Array.isArray(data) ? data : data?.items ?? data?.products ?? [];
    const productRoutes = products
      .filter((p: { id?: string }) => p?.id)
      .map((p: { id: string; updatedAt?: string }) => ({
        url: `${base}/products/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
