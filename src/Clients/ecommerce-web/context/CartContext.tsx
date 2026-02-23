"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { API_URL } from "@/lib/api";

interface CartContextType {
  cartCount: number;
  refreshCartCount: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  refreshCartCount: async () => {},
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState(0);
  const { user } = useAuth();

  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/basket/${user.id}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.items ? data.items.length : 0;
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error("Sepet sayısı çekilemedi:", error);
      setCartCount(0);
    }
  }, [user]);

  // Kullanıcı değiştiğinde sepet sayısını güncelle
  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCartCount: fetchCartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
