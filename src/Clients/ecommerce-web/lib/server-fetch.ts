/**
 * SSR fetch yardımcıları — sonsuz beklemeyi önlemek için timeout zorunlu.
 * Soft navigation'ın "Rendering..."de takılmasının ana nedeni timeout'suz fetch'ti.
 */

import { INTERNAL_API_URL } from "@/lib/api";

const DEFAULT_TIMEOUT_MS = 5000;

export async function serverFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { timeoutMs: _, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = path.startsWith("http") ? path : `${INTERNAL_API_URL}${path}`;
    return await fetch(url, {
      ...rest,
      cache: rest.cache ?? "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function serverFetchJson<T>(
  path: string,
  fallback: T,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  try {
    const res = await serverFetch(path, init);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
