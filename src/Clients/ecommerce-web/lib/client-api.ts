"use client";

import Cookies from "js-cookie";
import { API_URL } from "./api";
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
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `İstek başarısız (${res.status})`);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}

// --- Katalog ---

export function searchProducts(params: URLSearchParams) {
  return request<PagedResult<Product>>(`/catalog/products/search?${params}`);
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

export function getReviews(productId: string) {
  return request<Review[]>(`/catalog/products/${productId}/reviews`);
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
  },
) {
  return request<Review>(`/catalog/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

// --- Adres defteri ---

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
