import { serverFetchJson } from "@/lib/server-fetch";
import type { Product } from "@/lib/catalog";

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  productCount?: number;
}

const CATALOG_REVALIDATE = 60;

export function getBrands() {
  return serverFetchJson<Brand[]>("/catalog/brands", [], {
    revalidate: CATALOG_REVALIDATE,
  });
}

export function getBrandBySlug(slug: string) {
  return serverFetchJson<Brand | null>(
    `/catalog/brands/by-slug/${encodeURIComponent(slug)}`,
    null,
    { revalidate: CATALOG_REVALIDATE },
  );
}

export function getRelatedProducts(productId: string, take = 8) {
  return serverFetchJson<Product[]>(
    `/catalog/products/${productId}/related?take=${take}`,
    [],
    { revalidate: CATALOG_REVALIDATE },
  );
}

export function getBestsellers(take = 12) {
  return serverFetchJson<Product[]>(
    `/catalog/products/bestsellers?take=${take}`,
    [],
    { revalidate: CATALOG_REVALIDATE },
  );
}

export function getDeals(take = 12) {
  return serverFetchJson<Product[]>(
    `/catalog/products/deals?take=${take}`,
    [],
    { revalidate: CATALOG_REVALIDATE },
  );
}
