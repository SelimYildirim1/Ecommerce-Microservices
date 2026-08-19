"use client";

import Cookies from "js-cookie";
import { API_URL } from "./api";
import { parseApiError } from "./feedback";
import type {
  Favorite,
  PagedResult,
  Product,
  ProductFacets,
  Review,
  ReviewSummary,
} from "./catalog";

/** Tarayici tarafinda gateway'e giden istekler icin ortak sarmalayici. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = Cookies.get("token");

  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiError(text, `İstek başarısız (${res.status})`));
  }

  if (res.status === 204) return undefined as T;

  const body = await res.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

// --- Katalog ---

export type StoreCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
  isDefault: boolean;
  isActive: boolean;
};

export function getCurrencies() {
  return request<StoreCurrency[]>("/catalog/currencies");
}

export function searchProducts(params: URLSearchParams) {
  return request<PagedResult<Product>>(`/catalog/products/search?${params}`);
}

export function getRelatedProducts(productId: string, take = 8) {
  return request<Product[]>(`/catalog/products/${productId}/related?take=${take}`);
}

export function getFacets(params: URLSearchParams) {
  return request<ProductFacets>(`/catalog/products/facets?${params}`);
}

// --- Favoriler ---

export function getFavorites(userId: string) {
  return request<Favorite[]>(`/catalog/favorites/${userId}`);
}

export function getFavoriteIds(userId: string) {
  return request<string[]>(`/catalog/favorites/${userId}/ids`);
}

export function toggleFavorite(userId: string, productId: string) {
  return request<{ productId: string; isFavorite: boolean }>(
    `/catalog/favorites/${userId}/toggle`,
    { method: "POST", body: JSON.stringify({ productId }) },
  );
}

export function removeFavorite(userId: string, productId: string) {
  return request<void>(`/catalog/favorites/${userId}/${productId}`, {
    method: "DELETE",
  });
}

// --- Yorumlar ---

export function getReviews(
  productId: string,
  opts?: { sort?: string; rating?: number },
) {
  const params = new URLSearchParams();
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.rating) params.set("rating", String(opts.rating));
  const qs = params.toString();
  return request<Review[]>(
    `/catalog/products/${productId}/reviews${qs ? `?${qs}` : ""}`,
  );
}

export function getReviewSummary(productId: string) {
  return request<ReviewSummary>(`/catalog/products/${productId}/reviews/summary`);
}

export function createReview(
  productId: string,
  payload: {
    rating: number;
    title?: string;
    comment?: string;
    userId: string;
    userName: string;
    imageUrls?: string[];
  },
) {
  return request<Review>(`/catalog/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function voteReview(productId: string, reviewId: string, isHelpful: boolean) {
  return request<Review>(`/catalog/products/${productId}/reviews/${reviewId}/vote`, {
    method: "POST",
    body: JSON.stringify({ isHelpful }),
  });
}

export function getProductQuestions(productId: string) {
  return request<import("./catalog").ProductQuestion[]>(
    `/catalog/products/${productId}/questions`,
  );
}

export function createProductQuestion(
  productId: string,
  payload: { question: string; userName?: string; email?: string },
) {
  return request<import("./catalog").ProductQuestion>(
    `/catalog/products/${productId}/questions`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function uploadMedia(file: File): Promise<string> {
  const token = Cookies.get("token");
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/catalog/media/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiError(text, "Görsel yüklenemedi."));
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Görsel URL alınamadı.");
  return data.url;
}

// --- Profil ---

export interface Profile {
  id: string;
  userName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  roles: string[];
}

export function getProfile() {
  return request<Profile>("/auth/profile");
}

export function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}) {
  return request<Profile>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return request<{ message: string }>("/auth/profile/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Adreslerim ---

export interface Address {
  id: number;
  addressTitle: string;
  recipientName: string;
  street: string;
  city: string;
  district: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

export type SaveAddressPayload = Omit<Address, "id">;

export function getAddresses() {
  return request<Address[]>("/auth/addresses");
}

export function createAddress(payload: SaveAddressPayload) {
  return request<Address>("/auth/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAddress(id: number, payload: SaveAddressPayload) {
  return request<Address>(`/auth/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAddress(id: number) {
  return request<void>(`/auth/addresses/${id}`, { method: "DELETE" });
}

export function setDefaultAddress(id: number) {
  return request<Address>(`/auth/addresses/${id}/default`, { method: "PUT" });
}

// --- Bildirim Tercihleri ---

export interface NotificationPreferences {
  orderUpdates: boolean;
  campaigns: boolean;
  newsletter: boolean;
  sms: boolean;
  stockAlerts: boolean;
  priceDrops: boolean;
}

export function getNotificationPreferences() {
  return request<NotificationPreferences>("/auth/notification-preferences");
}

export function updateNotificationPreferences(payload: NotificationPreferences) {
  return request<NotificationPreferences>("/auth/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// --- Veri Dışa Aktarma & Hesap Silme ---

export function exportUserData() {
  return request<unknown>("/auth/export-data");
}

export function deleteAccount() {
  return request<{ message: string }>("/auth/account", { method: "DELETE" });
}

// --- Sadakat Programı ---

export interface LoyaltyAccount {
  userId: string;
  points: number;
  lastEarnedAt: string | null;
  transactions: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  orderId: string | null;
  createdAt: string;
}

export function getLoyaltyAccount(userId: string) {
  return request<LoyaltyAccount>(`/loyalty/${userId}`);
}

// --- Kullanıcı Kuponları ---

export interface UserCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  value: number;
  minBasketAmount: number;
  validTo: string;
  used: boolean;
}

export function getUserCoupons(userId: string) {
  return request<UserCoupon[]>(`/coupons/user/${userId}`);
}
