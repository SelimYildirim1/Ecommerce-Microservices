"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageOff, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCartDrawer } from "@/context/CartDrawerContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { API_URL, authHeaders } from "@/lib/api";
import { ensureGuestSession } from "@/lib/guest-session";
import { resolveMediaUrl } from "@/lib/catalog";
import { notify, parseApiError } from "@/lib/feedback";

interface CartItem {
  quantity: number;
  color: string;
  price: number;
  productId: string;
  productName: string;
  pictureUrl?: string | null;
  variantId?: string | null;
}

interface Basket {
  userName: string;
  items: CartItem[];
  totalPrice?: number;
}

/** Sağdan açılan mini sepet paneli. */
export default function CartDrawer() {
  const t = useTranslations("Common");
  const tCart = useTranslations("Cart");
  const tHeader = useTranslations("Header");
  const { open, closeDrawer } = useCartDrawer();
  const { user } = useAuth();
  const { refreshCartCount, cartCount } = useCart();
  const { formatPrice } = useCurrency();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchBasket = useCallback(async () => {
    setFetching(true);
    try {
      let userId = user?.id ?? null;
      if (!userId) {
        const guest = await ensureGuestSession();
        userId = guest?.guestId ?? null;
      }
      if (!userId) {
        setBasket(null);
        return;
      }

      const res = await fetch(`${API_URL}/basket/${userId}`, {
        cache: "no-store",
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setBasket({
          userName: data.userName ?? userId,
          items: Array.isArray(data.items) ? data.items : [],
          totalPrice: data.totalPrice,
        });
      } else {
        setBasket({ userName: userId, items: [] });
      }
    } catch {
      setBasket(null);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      void fetchBasket();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, fetchBasket]);

  // Sepet sayısı değişince açık drawer'ı yenile
  useEffect(() => {
    if (open) void fetchBasket();
  }, [cartCount, open, fetchBasket]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  const updateBasket = async (updatedItems: CartItem[]) => {
    if (!basket) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/basket`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userName: basket.userName, items: updatedItems }),
      });

      if (res.ok) {
        const updated = await res.json();
        setBasket({
          userName: basket.userName,
          items: Array.isArray(updated.items) ? updated.items : updatedItems,
          totalPrice: updated.totalPrice,
        });
        await refreshCartCount();
      } else {
        const errorText = await res.text();
        notify.error(parseApiError(errorText, "Sepet güncellenemedi."));
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const changeQuantity = async (productId: string, color: string, change: number) => {
    if (!basket) return;
    const newItems = basket.items
      .map((item) => {
        if (item.productId === productId && (item.color ?? "Standart") === color) {
          const q = item.quantity + change;
          if (q < 1) return null;
          return { ...item, quantity: q };
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);
    await updateBasket(newItems);
  };

  const removeItem = async (productId: string, color: string) => {
    if (!basket) return;
    await updateBasket(
      basket.items.filter(
        (i) => !(i.productId === productId && (i.color ?? "Standart") === color),
      ),
    );
  };

  const items = basket?.items ?? [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
        aria-hidden={!open}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={tHeader("cart")}
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShoppingBag className="h-5 w-5" />
            {tCart("title")}
            {items.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={tHeader("closeMenu")}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fetching && items.length === 0 ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-20 w-16 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="font-medium">{t("cartEmpty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tCart("emptyHint")}
              </p>
              <button
                type="button"
                onClick={closeDrawer}
                className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                {t("continueShopping")}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const image = item.pictureUrl
                  ? resolveMediaUrl(item.pictureUrl)
                  : null;
                const key = `${item.productId}-${item.color ?? "Standart"}-${item.variantId ?? ""}`;

                return (
                  <li key={key} className="flex gap-3 px-5 py-4">
                    <Link
                      href={`/products/${item.productId}`}
                      onClick={closeDrawer}
                      className="relative flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={item.productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.productId}`}
                        onClick={closeDrawer}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {item.productName}
                      </Link>
                      {item.color && item.color !== "Standart" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.color}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold">
                        {formatPrice(item.price)}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-border">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              changeQuantity(
                                item.productId,
                                item.color ?? "Standart",
                                -1,
                              )
                            }
                            aria-label="Adet azalt"
                            className="flex h-7 w-7 items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              changeQuantity(
                                item.productId,
                                item.color ?? "Standart",
                                1,
                              )
                            }
                            aria-label="Adet artır"
                            className="flex h-7 w-7 items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            removeItem(item.productId, item.color ?? "Standart")
                          }
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-danger hover:underline disabled:opacity-40"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-white px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("subtotal")}</span>
              <span className="text-lg font-semibold">{formatPrice(total)}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="flex h-11 items-center justify-center rounded-lg bg-foreground text-sm font-medium text-white transition hover:bg-gray-800"
              >
                {t("checkout")}
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="flex h-11 items-center justify-center rounded-lg border border-border text-sm font-medium transition hover:bg-muted"
              >
                {t("viewCart")}
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
