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
  slug: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isFeatured: boolean;
  showInMenu: boolean;
  productCount: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CategoryTreeNode extends StorefrontCategory {
  children: CategoryTreeNode[];
}

const CATALOG_REVALIDATE = 60;

export async function getCategories(): Promise<StorefrontCategory[]> {
  const data = await serverFetchJson<StorefrontCategory[]>(
    "/catalog/categories",
    [],
    { revalidate: CATALOG_REVALIDATE },
  );
  return Array.isArray(data) ? data : [];
}

export async function getCategoryBySlug(
  slug: string,
): Promise<StorefrontCategory | null> {
  return serverFetchJson<StorefrontCategory | null>(
    `/catalog/categories/by-slug/${encodeURIComponent(slug)}`,
    null,
    { revalidate: CATALOG_REVALIDATE },
  );
}

export function categoryHref(category: StorefrontCategory): string {
  if (category.slug) return `/kategori/${category.slug}`;
  return `/products?category=${category.id}`;
}

/** Flat listeden agac olusturur. */
export function buildCategoryTree(
  categories: StorefrontCategory[],
): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();

  for (const c of categories) {
    map.set(c.id, { ...c, children: [] });
  }

  const roots: CategoryTreeNode[] = [];

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}

/** Header menusu icin gosterilecek kok kategoriler. */
export function menuRoots(categories: StorefrontCategory[]): CategoryTreeNode[] {
  return buildCategoryTree(categories.filter((c) => c.showInMenu !== false)).filter(
    (c) => !c.parentId,
  );
}

/**
 * Ana sayfadaki daire seridinde gosterilecek kategoriler.
 * Once isFeatured olanlar; yoksa gorseli olanlar (geriye uyumlu).
 */
export function pickFeatured(
  categories: StorefrontCategory[],
  limit = 8,
): StorefrontCategory[] {
  const featured = categories
    .filter((c) => c.isFeatured && c.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (featured.length > 0) return featured.slice(0, limit);

  return categories
    .filter((c) => c.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);
}
