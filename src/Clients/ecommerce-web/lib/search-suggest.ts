export type SearchSuggestItem = {
  id: string;
  name: string;
  slug?: string | null;
  imageUrl?: string | null;
};

export type SearchSuggestDto = {
  categories: SearchSuggestItem[];
  brands: SearchSuggestItem[];
  queries: string[];
};

export type ActiveCampaign = {
  id: string;
  name: string;
  description?: string | null;
};

export function categorySuggestHref(item: SearchSuggestItem) {
  return item.slug ? `/kategori/${item.slug}` : `/products?category=${item.id}`;
}

export function brandSuggestHref(item: SearchSuggestItem) {
  return item.slug ? `/marka/${item.slug}` : `/products?brand=${item.id}`;
}

export function firstNameOf(name?: string | null) {
  if (!name || name === "Kullanıcı" || name.includes("@")) return null;
  return name.trim().split(/\s+/)[0] || null;
}
