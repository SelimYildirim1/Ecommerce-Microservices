/**
 * Misafir oturumu — Identity kaydı olmadan guest-{uuid} JWT.
 * Kullanıcı token'ı (`token`) yoksa sepet/checkout bu oturumu kullanır.
 */

import Cookies from "js-cookie";
import { API_URL } from "@/lib/api";

const GUEST_COOKIE = "guestToken";
const USER_COOKIE = "token";

export function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf-8"),
    );
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf-8"),
    );
    if (!payload.exp) return false;
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function getUserToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return Cookies.get(USER_COOKIE);
}

export function getGuestToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const t = Cookies.get(GUEST_COOKIE);
  if (!t || isExpired(t)) {
    if (t) Cookies.remove(GUEST_COOKIE, { path: "/" });
    return undefined;
  }
  return t;
}

/** Aktif kimlik: önce üye token, yoksa misafir. */
export function getActiveToken(): string | undefined {
  const user = getUserToken();
  if (user && !isExpired(user)) return user;
  return getGuestToken();
}

export function getActiveBasketId(): string | null {
  const token = getActiveToken();
  return token ? decodeJwtSub(token) : null;
}

function setGuestCookie(token: string, expiresInDays = 30) {
  Cookies.set(GUEST_COOKIE, token, {
    expires: expiresInDays,
    path: "/",
    sameSite: "lax",
    secure:
      typeof window !== "undefined" && window.location.protocol === "https:",
  });
}

export function clearGuestSession() {
  Cookies.remove(GUEST_COOKIE, { path: "/" });
}

/** Misafir JWT yoksa Identity'den alır. Üye girişliyse dokunmaz. */
export async function ensureGuestSession(): Promise<{
  guestId: string;
  token: string;
} | null> {
  const user = getUserToken();
  if (user && !isExpired(user)) return null;

  const existing = getGuestToken();
  if (existing) {
    const id = decodeJwtSub(existing);
    if (id) return { guestId: id, token: existing };
  }

  const res = await fetch(`${API_URL}/auth/guest`, { method: "POST" });
  if (!res.ok) throw new Error("Misafir oturumu açılamadı.");

  const data = (await res.json()) as {
    guestId: string;
    token: string;
    expiresInDays?: number;
  };

  setGuestCookie(data.token, data.expiresInDays ?? 30);
  return { guestId: data.guestId, token: data.token };
}

/** Üye girişinden sonra misafir sepetini birleştirir. */
export async function mergeGuestBasketInto(userId: string, userToken: string) {
  const guest = getGuestToken();
  if (!guest) return;

  const fromUserName = decodeJwtSub(guest);
  if (!fromUserName || !fromUserName.startsWith("guest-")) {
    clearGuestSession();
    return;
  }

  try {
    await fetch(`${API_URL}/basket/merge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ fromUserName, toUserName: userId }),
    });
  } catch {
    /* merge başarısız olsa da giriş devam eder */
  } finally {
    clearGuestSession();
  }
}
