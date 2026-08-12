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
import { notify } from "@/lib/feedback";

export const FAVORITES_CHANGE_EVENT = "ys-favorites-change";

function emitFavoritesChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
  }
}

interface FavoritesContextType {
  favoriteIds: Set<string>;
  favoriteCount: number;
  /** Liste sayfalarinin yeniden cekmesi icin artan sayac */
  revision: number;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteIds: new Set(),
  favoriteCount: 0,
  revision: 0,
  isFavorite: () => false,
  toggle: async () => false,
  refresh: async () => {},
  isLoading: false,
});

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const bump = useCallback(() => {
    setRevision((n) => n + 1);
    emitFavoritesChange();
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const ids = await api.getFavoriteIds(user.id);
      setFavoriteIds(new Set(ids.map(String)));
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) return false;

      const id = String(productId);
      const previous = new Set(favoriteIds);
      const next = new Set(favoriteIds);
      const willAdd = !next.has(id);

      if (willAdd) next.add(id);
      else next.delete(id);
      // Badge aninda guncellenir; liste yenilemesi API sonrasi bump ile
      setFavoriteIds(next);

      try {
        const result = await api.toggleFavorite(user.id, id);
        const isFav = Boolean(result.isFavorite);

        // Sunucu gercegiyle senkronize et
        const ids = await api.getFavoriteIds(user.id).catch(() => null);
        if (ids) {
          setFavoriteIds(new Set(ids.map(String)));
        } else {
          setFavoriteIds((curr) => {
            const synced = new Set(curr);
            if (isFav) synced.add(id);
            else synced.delete(id);
            return synced;
          });
        }

        bump();
        notify.success(
          isFav ? "Favorilere eklendi." : "Favorilerden çıkarıldı.",
        );
        return isFav;
      } catch {
        setFavoriteIds(previous);
        notify.error("Favori güncellenemedi. Lütfen tekrar deneyin.");
        return previous.has(id);
      }
    },
    [user, favoriteIds, bump],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoriteCount: favoriteIds.size,
        revision,
        isFavorite: (id: string) => favoriteIds.has(String(id)),
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
