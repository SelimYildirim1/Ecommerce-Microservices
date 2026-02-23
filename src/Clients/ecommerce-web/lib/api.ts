// =============================================================
//  Merkezi API URL Konfigürasyonu
// =============================================================
//
// Tüm API URL'leri burada tanımlanır. Hardcoded URL kullanmayın!
//
// Kubernetes (Ingress) modunda:
//   NEXT_PUBLIC_API_GATEWAY_URL = http://e-commerce.local/api
//   NEXT_PUBLIC_SIGNALR_URL     = http://e-commerce.local/signalr
//   INTERNAL_API_URL (SSR)      = http://api-gateway:8080
//
// Docker Compose modunda:
//   NEXT_PUBLIC_API_GATEWAY_URL = http://localhost:8000
//   NEXT_PUBLIC_SIGNALR_URL     = http://localhost:5059
//   INTERNAL_API_URL (SSR)      = http://api-gateway:8080
// =============================================================

/**
 * Client-side API base URL (tarayıcı -> Ingress/port-forward -> API Gateway)
 * NEXT_PUBLIC_ prefix'i ile build sırasında baked-in olur.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8000";

/**
 * Server-side (SSR) API base URL (Next.js container -> K8s internal DNS)
 * Bu URL sadece sunucu tarafında kullanılır, tarayıcıya asla gitmez.
 */
export const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://api-gateway:8080";

/**
 * SignalR Hub base URL (tarayıcı -> Ingress/port-forward -> Order API)
 */
export const SIGNALR_URL =
  process.env.NEXT_PUBLIC_SIGNALR_URL || "http://localhost:5059";

/**
 * Ortama göre doğru API URL'ini döndürür.
 * - SSR (server component) -> INTERNAL_API_URL (K8s internal DNS)
 * - Client (use client)    -> API_URL (Ingress veya port-forward)
 */
export function getApiUrl(): string {
  if (typeof window === "undefined") {
    // Server-side rendering - K8s internal DNS kullan
    return INTERNAL_API_URL;
  }
  // Client-side - Ingress veya port-forward URL kullan
  return API_URL;
}
