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
    // Sayfa yenilendiğinde Cookie'de token var mı diye bak
    const token = Cookies.get("token");
    if (token) {
      try {
        const decoded = decodeJwtPayload<DecodedToken>(token);
        
        // Token geçerliyse kullanıcıyı set et
        // NOT: Token expire kontrolü kaldırıldı - kullanıcı açıkça çıkış yapana kadar login kalacak
        setUser({
          id: decoded.sub,
          name: decoded.given_name,
          email: decoded.email
        });
      } catch (error) {
        // Token parse edilemiyorsa temizle (bozuk token)
        Cookies.remove("token", { path: "/" });
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    // 1. Token'ı Cookie'ye kaydet (30 gün sakla, kalıcı oturum için)
    Cookies.set("token", token, { 
      expires: 30, // 30 gün
      path: "/", // Tüm sayfalarda erişilebilir
      sameSite: "lax", // CSRF koruması için
      secure: process.env.NODE_ENV === "production" // Production'da HTTPS zorunlu
    });

    // 2. Token'ı çöz ve state'e at
    const decoded = decodeJwtPayload<DecodedToken>(token);
    setUser({
      id: decoded.sub,
      name: decoded.given_name,
      email: decoded.email
    });

    // 3. Anasayfaya yönlendir
    router.push("/");
    router.refresh(); // Server Component'lerin de haberi olsun
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Kolay kullanım için Hook
export const useAuth = () => useContext(AuthContext);