// =============================================================
//  Merkezi API URL Konfigürasyonu
// =============================================================

export const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8001";

export const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://api-gateway:8080";

export const SIGNALR_URL =
  process.env.NEXT_PUBLIC_SIGNALR_URL || "http://localhost:5059";

export function getApiUrl(): string {
  if (typeof window === "undefined") {
    return INTERNAL_API_URL;
  }
  return API_URL;
}

/**
 * Client-side Authorization header.
 * Önce üye `token`, yoksa misafir `guestToken` cookie'sini kullanır.
 */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  let token: string | undefined;
  if (typeof document !== "undefined") {
    const userMatch = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
    const guestMatch = document.cookie.match(/(?:^|;\s*)guestToken=([^;]*)/);
    token = userMatch
      ? decodeURIComponent(userMatch[1])
      : guestMatch
        ? decodeURIComponent(guestMatch[1])
        : undefined;
  }
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
