"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import * as api from "@/lib/client-api";

interface FavoritesContextType {
  favoriteIds: Set<string>;
  favoriteCount: number;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: new Set(),
  favoriteCount: 0,
  isFavorite: () => false,
  toggle: async () => false,
  refresh: async () => {},
  isLoading: false,
});

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const ids = await api.getFavoriteIds(user.id);
      setFavoriteIds(new Set(ids));
    } catch {
      // Favori servisi kapaliysa vitrin akisi bozulmaz
      setFavoriteIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) return false;

      // Iyimser guncelleme; hata halinde geri alinir
      const previous = new Set(favoriteIds);
      const next = new Set(favoriteIds);
      const willAdd = !next.has(productId);

      if (willAdd) next.add(productId);
      else next.delete(productId);
      setFavoriteIds(next);

      try {
        const result = await api.toggleFavorite(user.id, productId);
        return result.isFavorite;
      } catch {
        setFavoriteIds(previous);
        return previous.has(productId);
      }
    },
    [user, favoriteIds],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoriteCount: favoriteIds.size,
        isFavorite: (id: string) => favoriteIds.has(id),
        toggle,
        refresh,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
