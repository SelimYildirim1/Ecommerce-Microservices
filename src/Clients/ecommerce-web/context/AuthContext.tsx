"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

// JWT payload decode (jwt-decode bağımlılığı yerine basit base64 decode)
function decodeJwtPayload<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Geçersiz token");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as T;
}

interface DecodedToken {
  sub: string;
  email: string;
  given_name: string;
  exp: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    Cookies.remove("token", { path: "/" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

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
          setUser({
            id: decoded.sub,
            name: decoded.given_name,
            email: decoded.email,
          });
        }
      } catch {
        Cookies.remove("token", { path: "/" });
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
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

    const decoded = decodeJwtPayload<DecodedToken>(token);
    setUser({
      id: decoded.sub,
      name: decoded.given_name,
      email: decoded.email,
    });

    router.push("/");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Kolay kullanım için Hook
export const useAuth = () => useContext(AuthContext);