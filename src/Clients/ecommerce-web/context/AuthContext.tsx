"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { mergeGuestBasketInto } from "@/lib/guest-session";

function decodeJwtPayload<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Geçersiz token");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as T;
}

interface DecodedToken {
  sub: string;
  email?: string;
  given_name?: string;
  exp: number;
  role?: string | string[];
  ["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]?: string | string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

function rolesOf(decoded: DecodedToken): string[] {
  const raw =
    decoded.role ??
    decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function applyTokenCookie(token: string) {
  let expiresDays = 1;
  try {
    const decoded = decodeJwtPayload<DecodedToken>(token);
    if (decoded.exp) {
      const msLeft = decoded.exp * 1000 - Date.now();
      expiresDays = Math.max(msLeft / (1000 * 60 * 60 * 24), 1 / 24);
    }
  } catch {
    /* ignore */
  }

  Cookies.set("token", token, {
    expires: expiresDays,
    path: "/",
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  });
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<string | null>(null);

  const logout = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    Cookies.remove("token", { path: "/" });
    tokenRef.current = null;
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const silentRefresh = useCallback(async () => {
    const currentToken = tokenRef.current || Cookies.get("token");
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) logout();
        return;
      }
      const data = (await res.json()) as { token: string };
      applyTokenCookie(data.token);
      tokenRef.current = data.token;
      const decoded = decodeJwtPayload<DecodedToken>(data.token);
      setUser({
        id: decoded.sub,
        name: decoded.given_name || "Kullanıcı",
        email: decoded.email || "",
      });
      scheduleRefresh(data.token);
    } catch {
      /* ağ hatası */
    }
  }, [logout]);

  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    tokenRef.current = token;
    try {
      const decoded = decodeJwtPayload<DecodedToken>(token);
      if (!decoded.exp) return;
      const ms = decoded.exp * 1000 - Date.now() - 2 * 60 * 1000;
      if (ms <= 0) {
        void silentRefresh();
        return;
      }
      refreshTimer.current = setTimeout(() => {
        void silentRefresh();
      }, Math.min(ms, 2147483647));
    } catch {
      /* ignore */
    }
  }, [silentRefresh]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      try {
        const decoded = decodeJwtPayload<DecodedToken>(token);
        const nowSec = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < nowSec) {
          Cookies.remove("token", { path: "/" });
          setUser(null);
        } else {
          const roles = rolesOf(decoded);
          const isGuest =
            decoded.sub?.startsWith("guest-") || roles.includes("Guest");
          if (isGuest) {
            Cookies.remove("token", { path: "/" });
            setUser(null);
          } else {
            setUser({
              id: decoded.sub,
              name: decoded.given_name || "Kullanıcı",
              email: decoded.email || "",
            });
            scheduleRefresh(token);
          }
        }
      } catch {
        Cookies.remove("token", { path: "/" });
        setUser(null);
      }
    }
    setIsLoading(false);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  const login = async (token: string) => {
    applyTokenCookie(token);
    tokenRef.current = token;
    const decoded = decodeJwtPayload<DecodedToken>(token);
    await mergeGuestBasketInto(decoded.sub, token);

    setUser({
      id: decoded.sub,
      name: decoded.given_name || "Kullanıcı",
      email: decoded.email || "",
    });
    scheduleRefresh(token);

    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
