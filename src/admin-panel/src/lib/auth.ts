export const AUTH_COOKIE = "admin_token";

export const AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8001/auth";

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

export function isAdmin(token: string): boolean {
  const user = parseUser(token);
  return user?.roles.includes("Admin") ?? false;
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
  )}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function clearToken() {
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch(`${AUTH_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || "Giriş başarısız.");
  }

  const data = (await res.json()) as { token: string };
  const user = parseUser(data.token);

  if (!user) throw new Error("Token çözümlenemedi.");
  if (!user.roles.includes("Admin"))
    throw new Error("Bu hesabın yönetim paneline erişim yetkisi yok.");

  return { token: data.token, user };
}
