// =============================================================
//  Katalog tipleri ve vitrin yardimcilari
// =============================================================
// Sunucu ve istemci bilesenleri ayni tipleri paylasir; boylece
// urun karti, liste ve detay sayfasi tek bir sozlesmeye bakar.

import { API_URL } from "@/lib/api";
import { formatConvertedPrice, getCurrencyRuntime } from "./currency-runtime";

export interface Variant {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  specifics: Record<string, unknown> | null;
  isActive: boolean;
  compareAtPrice?: number | null;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  mediaType?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  primaryImageUrl: string | null;
  isActive: boolean;
  price: number;
  stock: number;
  variants: Variant[];
  categoryId?: string | null;
  brandId?: string | null;
  images?: ProductImage[] | null;
  averageRating?: number | null;
  reviewCount?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  attributes?: ProductAttributeInfo[] | null;
}

export interface ProductAttributeInfo {
  code: string;
  name: string;
  isVariant: boolean;
  options?: string | null;
  sortOrder: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FacetItem {
  id: string;
  name: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  minPrice: number;
  maxPrice: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  moderatorNote?: string | null;
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  notHelpfulCount?: number;
  imageUrls?: string[];
  createdAt: string;
}

export interface ReviewSummary {
  productId: string;
  averageRating: number;
  totalCount: number;
  distribution: Record<string, number>;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userId: string | null;
  userName: string;
  email: string | null;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  isApproved: boolean;
  createdAt: string;
}

export interface Favorite {
  id: string;
  productId: string;
  productName: string;
  primaryImageUrl: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export const SORT_OPTIONS = [
  { value: "Newest", label: "Önce en yeniler" },
  { value: "PriceAsc", label: "Fiyat: düşükten yükseğe" },
  { value: "PriceDesc", label: "Fiyat: yüksekten düşüğe" },
  { value: "Rating", label: "En çok beğenilenler" },
  { value: "NameAsc", label: "İsme göre (A-Z)" },
  { value: "NameDesc", label: "İsme göre (Z-A)" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 24;

/** Seçili para birimine (cookie/runtime) göre formatlar; base fiyat TRY varsayılır. */
export function formatPrice(value: number): string {
  return formatConvertedPrice(
    Number.isFinite(value) ? value : 0,
    getCurrencyRuntime(),
  );
}

/** Vitrinde gösterilecek karşılaştırma (üstü çizili) fiyat. */
export function getCompareAtPrice(product: Product): number | null {
  const sale = getPrice(product);
  const candidates = (product.variants ?? [])
    .map((v) => Number(v.compareAtPrice))
    .filter((p) => Number.isFinite(p) && p > sale);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

/** Vitrinde gosterilecek fiyat: aktif varyantlarin en dususu. */
export function getPrice(product: Product): number {
  const direct = Number(product.price);
  if (!Number.isNaN(direct) && direct > 0) return direct;

  const active = (product.variants ?? []).filter((v) => v.isActive !== false);
  if (active.length > 0) {
    const prices = active.map((v) => Number(v.price)).filter((p) => !Number.isNaN(p));
    if (prices.length > 0) return Math.min(...prices);
  }

  return 0;
}

export function getTotalStock(product: Product): number {
  const direct = Number(product.stock);
  if (!Number.isNaN(direct) && direct > 0) return direct;

  return (product.variants ?? []).reduce(
    (sum, v) => sum + (Number(v.stockQuantity) || 0),
    0,
  );
}

/**
 * Panelden yuklenen gorseller `/uploads/...` seklinde goreli gelir; tarayicinin
 * bunlari magaza adresinde degil gateway'de aramasi gerekir.
 */
export function resolveMediaUrl(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Eski kayitlarda gorsel `pictureUrl` alaninda tutulabiliyor. */
export function getImageUrl(product: Product): string | null {
  if (product.primaryImageUrl) return resolveMediaUrl(product.primaryImageUrl);

  const legacy = (product as unknown as Record<string, unknown>)["pictureUrl"];
  return typeof legacy === "string" && legacy.length > 0
    ? resolveMediaUrl(legacy)
    : null;
}

/** Kart carousel'i için görseller; birincil önce, videolar hariç. */
export function getCardImageUrls(product: Product): string[] {
  const fromGallery = [...(product.images ?? [])]
    .filter((i) => (i.mediaType || "image") !== "video" && Boolean(i.url))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .map((i) => resolveMediaUrl(i.url));

  const unique = [...new Set(fromGallery)];
  if (unique.length > 0) return unique;

  const fallback = getImageUrl(product);
  return fallback ? [fallback] : [];
}

/** Varyant anahtarlari katalogda kod olarak tutulur; vitrinde Turkce etiket gosterilir. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  color: "Renk",
  size: "Beden",
  shoe_size: "Numara",
  fabric: "Kumaş",
  material: "Malzeme",
  ram: "RAM",
  storage: "Depolama",
  cpu: "İşlemci",
  gpu: "Ekran Kartı",
  screen_size: "Ekran Boyutu",
  volume: "Hacim",
  weight: "Ağırlık",
  dimension: "Ölçü",
  warranty: "Garanti Süresi",
};

export function attributeLabel(
  code: string,
  attributes?: ProductAttributeInfo[] | null,
): string {
  const fromCategory = attributes?.find(
    (a) => a.code.toLowerCase() === code.toLowerCase(),
  )?.name;
  if (fromCategory) return fromCategory;

  const known = ATTRIBUTE_LABELS[code.toLowerCase()];
  if (known) return known;

  return code
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toLocaleUpperCase("tr-TR"));
}

/**
 * Varyantin `specifics` alanindan secim gruplarini cikarir.
 * Admin'de "varyant oluşturur" işaretli özellikler seçim olarak gösterilir.
 */
const NON_VARIANT_SPECIFIC_KEYS = new Set([
  "warranty",
  "fabric",
  "material",
  "weight",
  "volume",
  "dimension",
  "cpu",
  "gpu",
  "screen_size",
]);

export function getVariantOptions(
  variants: Variant[],
  attributes?: ProductAttributeInfo[] | null,
): Record<string, string[]> {
  const variantCodes = new Set(
    (attributes ?? [])
      .filter((a) => a.isVariant)
      .map((a) => a.code.toLowerCase()),
  );

  const groups: Record<string, string[]> = {};

  for (const variant of variants) {
    if (!variant.isActive || !variant.specifics) continue;

    for (const [key, raw] of Object.entries(variant.specifics)) {
      const code = key.toLowerCase();
      if (variantCodes.size > 0) {
        if (!variantCodes.has(code)) continue;
      } else if (NON_VARIANT_SPECIFIC_KEYS.has(code)) {
        continue;
      }
      if (raw === null || raw === undefined) continue;
      const value = String(raw);
      if (!value) continue;

      groups[key] ??= [];
      if (!groups[key].includes(value)) groups[key].push(value);
    }
  }

  return Object.fromEntries(
    Object.entries(groups).filter(([, values]) => values.length > 1),
  );
}

/** Secilen kombinasyona uyan ilk aktif varyanti bulur. */
export function findVariant(
  variants: Variant[],
  selection: Record<string, string>,
): Variant | null {
  const keys = Object.keys(selection);
  if (keys.length === 0) return variants.find((v) => v.isActive) ?? null;

  return (
    variants.find(
      (v) =>
        v.isActive &&
        keys.every((k) => String(v.specifics?.[k] ?? "") === selection[k]),
    ) ?? null
  );
}

/** Sepette gosterilecek varyant etiketi: "Siyah / M" */
export function describeVariant(
  variant: Variant | null,
  attributes?: ProductAttributeInfo[] | null,
): string {
  if (!variant?.specifics) return "Standart";

  const variantCodes = new Set(
    (attributes ?? [])
      .filter((a) => a.isVariant)
      .map((a) => a.code.toLowerCase()),
  );

  const parts = Object.entries(variant.specifics)
    .filter(([key, v]) => {
      if (v === null || v === undefined || String(v).length === 0) return false;
      if (variantCodes.size > 0) return variantCodes.has(key.toLowerCase());
      return !NON_VARIANT_SPECIFIC_KEYS.has(key.toLowerCase());
    })
    .map(([, v]) => String(v));

  return parts.length > 0 ? parts.join(" / ") : "Standart";
}
