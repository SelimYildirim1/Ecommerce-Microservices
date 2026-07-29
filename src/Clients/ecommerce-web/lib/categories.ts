// =============================================================
//  Kategori agaci
// =============================================================
// Vitrinin kategori seridi ve menusu bu ucdan beslenir. Servis
// erisilemezse bos liste doner, sayfa yine de render edilir.

import { serverFetchJson } from "@/lib/server-fetch";

export interface StorefrontCategory {
  id: string;
  name: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
}

export async function getCategories(): Promise<StorefrontCategory[]> {
  const data = await serverFetchJson<StorefrontCategory[]>(
    "/catalog/categories",
    [],
  );
  return Array.isArray(data) ? data : [];
}

/** Ana sayfadaki daire seridinde gosterilecek gorselli kategoriler. */
export function pickFeatured(
  categories: StorefrontCategory[],
  limit = 8,
): StorefrontCategory[] {
  return categories
    .filter((c) => c.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);
}
