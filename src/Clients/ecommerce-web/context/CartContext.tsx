"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { API_URL, authHeaders } from "@/lib/api";
import {
  ensureGuestSession,
  getActiveBasketId,
} from "@/lib/guest-session";

interface CartContextType {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
  /** Aktif sepet kimliği (üye id veya guest-*). */
  basketUserId: string | null;
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  refreshCartCount: async () => {},
  basketUserId: null,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState(0);
  const [basketUserId, setBasketUserId] = useState<string | null>(null);
  const { user, isLoading } = useAuth();

  const fetchCartCount = useCallback(async () => {
    if (isLoading) return;

    try {
      let userId = user?.id ?? null;

      if (!userId) {
        const guest = await ensureGuestSession();
        userId = guest?.guestId ?? null;
      }

      setBasketUserId(userId);
      if (!userId) {
        setCartCount(0);
        return;
      }

      const res = await fetch(`${API_URL}/basket/${userId}`, {
        cache: "no-store",
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data.items)
          ? data.items.reduce(
              (sum: number, i: { quantity?: number }) =>
                sum + (Number(i.quantity) || 0),
              0,
            )
          : 0;
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  }, [user, isLoading]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  // SSR ile tutarlılık için cookie'den de oku
  useEffect(() => {
    if (!basketUserId) {
      setBasketUserId(getActiveBasketId());
    }
  }, [basketUserId]);

  return (
    <CartContext.Provider
      value={{ cartCount, refreshCartCount: fetchCartCount, basketUserId }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
