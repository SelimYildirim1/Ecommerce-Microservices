"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartOff, ImageOff } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import * as api from "@/lib/client-api";
import { formatPrice, resolveMediaUrl, type Favorite } from "@/lib/catalog";

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh } = useFavorites();
  const router = useRouter();

  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      setItems(await api.getFavorites(user.id));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (productId: string) => {
    if (!user) return;

    setItems((prev) => prev.filter((i) => i.productId !== productId));
    await api.removeFavorite(user.id, productId).catch(() => load());
    await refresh();
  };

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">Favorilerim</h1>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-50" />
            ))}
          </div>
        ) : items.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <Link href={`/products/${item.productId}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-gray-50">
                    {item.primaryImageUrl ? (
                      <img
                        src={resolveMediaUrl(item.primaryImageUrl)}
                        alt={item.productName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
        )}
      </main>

    </div>
  );
}
