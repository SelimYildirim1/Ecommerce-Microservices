export const AUTH_COOKIE = "admin_token";

/** Next.js basePath — hard redirects (window.location) için gerekli */
export const ADMIN_BASE_PATH = "/admin";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;

export const AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8001/auth";

export const STAFF_ROLES = ["Admin", "Editor", "Support", "Warehouse"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface AdminUser {
  id: string;
  userName: string;
  email: string;
  roles: string[];
}

interface JwtPayload {
  sub?: string;
  email?: string;
  given_name?: string;
  exp?: number;
  [key: string]: unknown;
}

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Rol claim'i tek deger veya dizi olarak gelebilir; ikisini de normalize eder. */
function readRoles(payload: JwtPayload): string[] {
  const raw = payload[ROLE_CLAIM] ?? payload.role ?? payload.roles;
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [String(raw)];
}

export function parseUser(token: string): AdminUser | null {
  const payload = decodeToken(token);
  if (!payload?.sub) return null;

  return {
    id: payload.sub,
    userName: payload.given_name ?? "",
    email: payload.email ?? "",
    roles: readRoles(payload),
  };
}

export function isExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now();
}

/** Token suresi bitmeye 2 dk kala yenileme penceresi. */
export function isNearExpiry(token: string, skewMs = 2 * 60 * 1000): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() <= skewMs;
}

export function isAdmin(token: string): boolean {
  const user = parseUser(token);
  return user?.roles.includes("Admin") ?? false;
}

export function isStaff(token: string): boolean {
  const user = parseUser(token);
  return user?.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)) ?? false;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(
    token
  )}; expires=${expires}; path=${ADMIN_BASE_PATH}; SameSite=Lax${secure}`;
}

export function clearToken() {
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${ADMIN_BASE_PATH}`;
  // Eski path=/ cookie'lerini de temizle
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export async function login(
  email: string,
  password: string,
  rememberMe = true
): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch(`${AUTH_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "Giriş başarısız.");
  }

  const data = (await res.json()) as { token: string };
  const user = parseUser(data.token);

  if (!user) throw new Error("Token çözümlenemedi.");
  if (!user.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)))
    throw new Error("Bu hesabın yönetim paneline erişim yetkisi yok.");

  return { token: data.token, user };
}

let refreshInFlight: Promise<string | null> | null = null;

/** Süresi dolmadan önce sessiz yenileme. Paralel çağrıları tek isteğe birleştirir. */
export async function refreshToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${AUTH_API}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token: string };
      setToken(data.token, 30);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Gerekirse token yeniler ve guncel degeri dondurur. */
export async function ensureFreshToken(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  if (isExpired(token) || isNearExpiry(token)) {
    return (await refreshToken()) ?? (isExpired(token) ? null : token);
  }
  return token;
}
