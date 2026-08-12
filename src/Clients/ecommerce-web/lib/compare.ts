// =============================================================
//  Ürün karşılaştırma — localStorage (max 4)
// =============================================================

export interface CompareItem {
  id: string;
  name: string;
  image: string | null;
  price: number;
  brandName?: string | null;
  categoryName?: string | null;
  description?: string | null;
  stock?: number;
  averageRating?: number | null;
}

const KEY = "ys_compare";
const MAX = 4;

export function getCompareItems(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CompareItem =>
          !!item &&
          typeof item === "object" &&
          typeof (item as CompareItem).id === "string" &&
          typeof (item as CompareItem).name === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function isInCompare(id: string): boolean {
  return getCompareItems().some((p) => p.id === id);
}

/** Ekle; zaten varsa çıkar. Doluysa false döner. */
export function toggleCompare(item: CompareItem): {
  items: CompareItem[];
  added: boolean;
  full: boolean;
} {
  if (typeof window === "undefined") {
    return { items: [], added: false, full: false };
  }

  const current = getCompareItems();
  const exists = current.some((p) => p.id === item.id);

  if (exists) {
    const items = current.filter((p) => p.id !== item.id);
    persist(items);
    return { items, added: false, full: false };
  }

  if (current.length >= MAX) {
    return { items: current, added: false, full: true };
  }

  const items = [...current, item].slice(0, MAX);
  persist(items);
  return { items, added: true, full: false };
}

export function removeFromCompare(id: string): CompareItem[] {
  const items = getCompareItems().filter((p) => p.id !== id);
  persist(items);
  return items;
}

export function clearCompare(): void {
  persist([]);
}

function persist(items: CompareItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("ys-compare-change", { detail: items }));
  } catch {
    /* quota / private mode */
  }
}

export const COMPARE_MAX = MAX;
