/**
 * SSR fetch yardımcıları — sonsuz beklemeyi önlemek için timeout zorunlu.
 * Soft navigation'ın "Rendering..."de takılmasının ana nedeni timeout'suz fetch'ti.
 *
 * Varsayılan: cache: "no-store" (auth/cart/kişisel veri).
 * Katalog/CMS için: { revalidate: 60 } ile ISR.
 */

import { INTERNAL_API_URL } from "@/lib/api";

const DEFAULT_TIMEOUT_MS = 5000;

export type ServerFetchInit = RequestInit & {
  timeoutMs?: number;
  /** Next.js ISR saniyesi. Verilirse no-store uygulanmaz. */
  revalidate?: number | false;
};

export async function serverFetch(
  path: string,
  init?: ServerFetchInit,
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _, revalidate, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = path.startsWith("http") ? path : `${INTERNAL_API_URL}${path}`;
    const useRevalidate = revalidate !== undefined;

    return await fetch(url, {
      ...rest,
      ...(useRevalidate
        ? {
            next: {
              ...(typeof rest.next === "object" ? rest.next : {}),
              revalidate,
            },
          }
        : {
            cache: rest.cache ?? "no-store",
          }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function serverFetchJson<T>(
  path: string,
  fallback: T,
  init?: ServerFetchInit,
): Promise<T> {
  try {
    const res = await serverFetch(path, init);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
