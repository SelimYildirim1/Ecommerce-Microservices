// =============================================================
//  Son görüntülenen ürünler — localStorage (max 8)
// =============================================================

export interface RecentlyViewedItem {
  id: string;
  name: string;
  image: string | null;
  price: number;
  brandName?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
}

const KEY = "ys_recently_viewed";
const MAX = 8;

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentlyViewedItem =>
          !!item &&
          typeof item === "object" &&
          typeof (item as RecentlyViewedItem).id === "string" &&
          typeof (item as RecentlyViewedItem).name === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecentlyViewed(item: RecentlyViewedItem): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  const next = [
    item,
    ...getRecentlyViewed().filter((p) => p.id !== item.id),
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
