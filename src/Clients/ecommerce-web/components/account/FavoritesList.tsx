"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeartOff, ImageOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  FAVORITES_CHANGE_EVENT,
  useFavorites,
} from "@/context/FavoritesContext";
import * as api from "@/lib/client-api";
import { formatPrice, resolveMediaUrl, type Favorite } from "@/lib/catalog";
import { ProductCardSkeletonGrid } from "@/components/ProductCardSkeleton";
import ShimmerImage from "@/components/ShimmerImage";

export default function FavoritesList({ limit }: { limit?: number }) {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh, revision } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const reqId = useRef(0);

  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;

    const id = ++reqId.current;
    setLoading(true);
    try {
      const data = await api.getFavorites(user.id);
      // Eski yanit gec gelirse yoksay (race)
      if (id !== reqId.current) return;
      setItems(data);
    } catch {
      if (id !== reqId.current) return;
      setItems([]);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, pathname, revision]);

  useEffect(() => {
    const sync = () => {
      void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener(FAVORITES_CHANGE_EVENT, sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const remove = async (productId: string) => {
    if (!user) return;

    setItems((prev) => prev.filter((i) => String(i.productId) !== String(productId)));
    try {
      await api.removeFavorite(user.id, productId);
      await refresh();
      // refresh bump etmez; listeyi elle yenile
      await load();
    } catch {
      await load();
    }
  };

  if (loading && items.length === 0) {
    return (
      <ProductCardSkeletonGrid
        count={6}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      />
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <HeartOff className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-lg font-medium">Favori listeniz boş</p>
        <p className="mt-1 text-gray-500">
          Beğendiğiniz ürünleri kalp ikonuyla buraya ekleyebilirsiniz.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Ürünlere göz at
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(limit ? items.slice(0, limit) : items).map((item) => (
        <div
          key={item.id}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <Link href={`/products/${item.productId}`} className="relative block">
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
              {item.primaryImageUrl ? (
                <ShimmerImage
                  src={resolveMediaUrl(item.primaryImageUrl)}
                  alt={item.productName}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff className="h-10 w-10 text-gray-300" />
                </div>
              )}
            </div>
          </Link>

          <div className="flex flex-1 flex-col p-5">
            <Link href={`/products/${item.productId}`}>
              <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                {item.productName}
              </h3>
            </Link>

            <p className="mt-2 flex-1 text-lg font-semibold">
              {formatPrice(item.price)}
            </p>

            {!item.isActive && (
              <p className="mt-1 text-xs text-danger">Ürün şu an satışta değil</p>
            )}

            <button
              onClick={() => remove(item.productId)}
              className="mt-4 w-full rounded-lg border border-border py-2 text-xs font-medium transition-colors hover:border-foreground hover:bg-muted"
            >
              Favorilerden çıkar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
