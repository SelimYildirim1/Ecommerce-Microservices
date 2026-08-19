"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageOff, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCartDrawer } from "@/context/CartDrawerContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { API_URL, authHeaders } from "@/lib/api";
import { ensureGuestSession } from "@/lib/guest-session";
import { resolveMediaUrl } from "@/lib/catalog";
import { notify, parseApiError } from "@/lib/feedback";
import CartDrawerEmpty from "./CartDrawerEmpty";
import CartDrawerAlsoBought from "./CartDrawerAlsoBought";

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

function itemMeta(item: CartItem, unitLabel: string) {
  const variant = item.color && item.color !== "Standart" ? item.color : null;
  return variant ? `${variant} · ${unitLabel}` : unitLabel;
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

  const clearCart = async () => {
    if (!basket || basket.items.length === 0) return;
    await updateBasket([]);
  };

  const items = basket?.items ?? [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const productIds = useMemo(
    () => [...new Set(items.map((i) => i.productId))],
    [items],
  );

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
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold">
            <ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={1.7} />
            {tCart("title")}
          </h2>
          {items.length > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void clearCart()}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
              {tCart("clearCart")}
            </button>
          )}
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={tHeader("closeMenu")}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={
            items.length === 0
              ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
              : "flex-1 overflow-y-auto"
          }
        >
          {fetching && items.length === 0 && cartCount > 0 ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-[72px] w-[72px] rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 rounded bg-gray-100" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            open ? <CartDrawerEmpty /> : null
          ) : (
            <>
              <ul>
                {items.map((item) => {
                  const image = item.pictureUrl
                    ? resolveMediaUrl(item.pictureUrl)
                    : null;
                  const key = `${item.productId}-${item.color ?? "Standart"}-${item.variantId ?? ""}`;
                  const unitLabel = tCart("unitCount", { count: item.quantity });

                  return (
                    <li
                      key={key}
                      className="flex gap-3 border-b border-gray-100 px-5 py-4 last:border-b-0"
                    >
                      <Link
                        href={`/products/${item.productId}`}
                        onClick={closeDrawer}
                        className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                      >
                        {image ? (
                          <Image
                            src={image}
                            alt={item.productName}
                            fill
                            sizes="72px"
                            className="object-cover"
                          />
                        ) : (
                          <ImageOff className="h-6 w-6 text-gray-300" />
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.productId}`}
                            onClick={closeDrawer}
                            className="line-clamp-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            {item.productName}
                          </Link>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              removeItem(item.productId, item.color ?? "Standart")
                            }
                            aria-label={t("remove")}
                            title={t("remove")}
                            className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                          </button>
                        </div>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {itemMeta(item, unitLabel)}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center rounded-lg border border-gray-200">
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
                              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-medium">
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
                              className="flex h-7 w-7 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <CartDrawerAlsoBought productIds={productIds} />
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">{t("total")}</span>
              <span className="text-lg font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="flex h-12 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {tCart("goToCart")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
