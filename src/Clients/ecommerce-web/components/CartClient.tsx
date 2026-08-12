"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, ShoppingBag, Bookmark, Heart, ArrowRight } from "lucide-react";
import { API_URL, authHeaders } from "@/lib/api";
import { ensureGuestSession } from "@/lib/guest-session";
import { getTotalStock, resolveMediaUrl, type Product } from "@/lib/catalog";
import { notify, parseApiError } from "@/lib/feedback";
import * as clientApi from "@/lib/client-api";

interface CartItem {
  quantity: number;
  color: string;
  price: number;
  productId: string;
  productName: string;
  pictureUrl?: string | null;
}

interface Basket {
  userName: string;
  items: CartItem[];
  savedItems: CartItem[];
  totalPrice: number;
}

interface BasketSummary {
  subtotal: number;
  discountAmount: number;
  appliedCouponCode?: string | null;
  appliedCampaignName?: string | null;
  shippingCost: number;
  freeShipping: boolean;
  total: number;
  message?: string | null;
}

interface ShippingSettings {
  freeShippingThreshold: number;
}

const MAX_QTY_FALLBACK = 20;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

export default function CartClient({
  initialBasket,
  images = {},
  stocks = {},
}: {
  initialBasket: Basket | null;
  /** Urun kimligine gore birincil gorsel; sepet servisi gorsel tutmadigi icin disaridan gelir. */
  images?: Record<string, string>;
  /** Urun kimligine gore stok; yoksa istemci tarafinda cekilir. */
  stocks?: Record<string, number>;
}) {
  const [basket, setBasket] = useState<Basket | null>(
    initialBasket ? { ...initialBasket, savedItems: initialBasket.savedItems ?? [] } : null
  );
  const [loading, setLoading] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>(stocks);
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<BasketSummary | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const router = useRouter();
  const { refreshCartCount } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (!basket?.items?.length) return;

    const ids = basket.items.map((i) => i.productId);
    let cancelled = false;

    (async () => {
      const missing = ids.filter((id) => stockMap[id] === undefined);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`${API_URL}/catalog/products/${id}`);
            if (!res.ok) return [id, MAX_QTY_FALLBACK] as const;
            const product = (await res.json()) as Product;
            const stock = getTotalStock(product);
            return [id, stock > 0 ? stock : MAX_QTY_FALLBACK] as const;
          } catch {
            return [id, MAX_QTY_FALLBACK] as const;
          }
        }),
      );
      if (!cancelled) {
        setStockMap((prev) => {
          const next = { ...prev };
          for (const [id, stock] of entries) {
            if (next[id] === undefined) next[id] = stock;
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // stockMap okunur ama bağımlılığa eklenmez; aksi halde sonsuz döngü olur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basket?.items]);

  const fetchSummary = useCallback(
    async (couponCode: string | null) => {
      if (!basket?.userName || !basket.items?.length) {
        setSummary(null);
        return;
      }

      setSummaryLoading(true);
      try {
        if (!basket.userName) {
          await ensureGuestSession();
        }

        const res = await fetch(`${API_URL}/basket/summary`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            userName: basket.userName,
            couponCode: couponCode || null,
            shippingCarrierId: null,
          }),
        });

        if (!res.ok) return;

        const data = (await res.json()) as BasketSummary;
        setSummary({
          subtotal: Number(data.subtotal) || 0,
          discountAmount: Number(data.discountAmount) || 0,
          appliedCouponCode: data.appliedCouponCode ?? null,
          appliedCampaignName: data.appliedCampaignName ?? null,
          shippingCost: Number(data.shippingCost) || 0,
          freeShipping: Boolean(data.freeShipping),
          total: Number(data.total) || 0,
          message: data.message ?? null,
        });

        if (couponCode) {
          if (data.appliedCouponCode) {
            setAppliedCoupon(data.appliedCouponCode);
            setCouponMessage(data.message ?? "Kupon uygulandı.");
          } else {
            setAppliedCoupon(null);
            setCouponMessage(data.message ?? "Kupon uygulanamadı.");
          }
        }
      } catch {
        /* özet opsiyonel */
      } finally {
        setSummaryLoading(false);
      }
    },
    [basket?.userName, basket?.items?.length],
  );

  useEffect(() => {
    void fetchSummary(appliedCoupon);
  }, [basket?.userName, basket?.items, basket?.totalPrice, appliedCoupon, fetchSummary]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/shipping/settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ShippingSettings | null) => {
        if (!cancelled && data) setShippingSettings(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const calculateTotal = () => {
    if (!basket || !basket.items) return 0;
    return basket.items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const updateBasket = async (updatedItems: CartItem[]) => {
    if (!basket) return;
    setLoading(true);

    try {
      let userName = basket.userName;
      if (!userName) {
        const guest = await ensureGuestSession();
        userName = guest?.guestId ?? "";
      }

      const res = await fetch(`${API_URL}/basket`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userName, items: updatedItems }),
      });

      if (res.ok) {
        const updatedBasket = await res.json();
        if (updatedItems.length === 0 || !updatedBasket.items || updatedBasket.items.length === 0) {
          setBasket({ userName, items: [], savedItems: basket.savedItems ?? [], totalPrice: 0 });
        } else {
          setBasket(updatedBasket);
        }
        await refreshCartCount();
        router.refresh();
      } else {
        const errorText = await res.text();
        notify.error(parseApiError(errorText, "Sepet güncellenemedi."));
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı. Sepet güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!basket) return;
    const newItems = basket.items.filter((i) => i.productId !== productId);
    await updateBasket(newItems);
  };

  const changeQuantity = async (productId: string, change: number) => {
    if (!basket) return;
    const maxStock = stockMap[productId] ?? MAX_QTY_FALLBACK;

    const newItems = basket.items
      .map((item) => {
        if (item.productId !== productId) return item;
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return null;
        if (newQuantity > maxStock) {
          setStockWarning(
            maxStock >= MAX_QTY_FALLBACK && stockMap[productId] === undefined
              ? `En fazla ${MAX_QTY_FALLBACK} adet ekleyebilirsiniz.`
              : `Stok limiti: en fazla ${maxStock} adet.`,
          );
          return { ...item, quantity: maxStock };
        }
        setStockWarning(null);
        return { ...item, quantity: newQuantity };
      })
      .filter((item): item is CartItem => item !== null);

    await updateBasket(newItems);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      notify.error("Kupon kodu girin.");
      return;
    }
    await fetchSummary(code);
  };

  const clearCoupon = async () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponMessage(null);
    await fetchSummary(null);
  };

  const saveForLater = async (productId: string) => {
    if (!basket) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/basket/${basket.userName}/save-for-later/${productId}`,
        { method: "POST", headers: authHeaders() },
      );
      if (res.ok) {
        const updated = await res.json();
        setBasket({ ...updated, savedItems: updated.savedItems ?? [] });
        await refreshCartCount();
        router.refresh();
      } else {
        notify.error(parseApiError(await res.text(), "İşlem başarısız."));
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const moveToCart = async (productId: string) => {
    if (!basket) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/basket/${basket.userName}/move-to-cart/${productId}`,
        { method: "POST", headers: authHeaders() },
      );
      if (res.ok) {
        const updated = await res.json();
        setBasket({ ...updated, savedItems: updated.savedItems ?? [] });
        await refreshCartCount();
        router.refresh();
      } else {
        notify.error(parseApiError(await res.text(), "İşlem başarısız."));
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const moveToFavorites = async (productId: string) => {
    if (!user?.id) {
      notify.error("Favorilere eklemek için giriş yapın.");
      return;
    }
    setLoading(true);
    try {
      await clientApi.toggleFavorite(user.id, productId);
      const newItems = basket!.items.filter((i) => i.productId !== productId);
      await updateBasket(newItems);
      notify.success("Ürün favorilere taşındı.");
    } catch {
      notify.error("Favorilere taşınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const hasSavedItems = basket?.savedItems && basket.savedItems.length > 0;

  if (!basket || (!basket.items?.length && !hasSavedItems)) {
    return (
      <div className="text-center py-20 border border-border rounded-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-xl font-bold mb-1">Sepetiniz boş</h2>
        <p className="text-muted-foreground text-sm mb-6">Hemen alışverişe başlayın!</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition"
        >
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  const displaySubtotal = summary?.subtotal ?? calculateTotal();
  const displayTotal = summary?.total ?? calculateTotal();
  const threshold = shippingSettings?.freeShippingThreshold ?? 0;
  const freeShippingProgress =
    threshold > 0 ? Math.min(100, (displaySubtotal / threshold) * 100) : 0;
  const remainingForFree =
    threshold > 0 ? Math.max(0, threshold - displaySubtotal) : 0;

  const inputClass =
    "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Ürünler ({basket.items.length})
            </h2>
          </div>

          {stockWarning && (
            <div className="border-b border-border bg-amber-50 px-5 py-2 text-xs text-amber-800">
              {stockWarning}
            </div>
          )}

          <div className="divide-y divide-border">
            {basket.items.map((item) => {
              const image = item.pictureUrl || images[item.productId];
              const maxStock = stockMap[item.productId];

              return (
                <div key={item.productId} className="flex items-center gap-4 p-5">
                  <Link
                    href={`/products/${item.productId}`}
                    className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted transition hover:opacity-80"
                  >
                    {image ? (
                      <Image
                        src={resolveMediaUrl(image)}
                        alt={item.productName}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ImageOff className="h-8 w-8 text-muted-foreground/40" strokeWidth={1} />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productId}`}
                      className="text-sm font-medium hover:underline line-clamp-2"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      Birim: {formatPrice(item.price)}
                      {typeof maxStock === "number" && (
                        <span className="ml-2">· Stok: {maxStock}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => changeQuantity(item.productId, -1)}
                          disabled={loading}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted disabled:opacity-50 transition text-sm"
                        >
                          -
                        </button>
                        <span className="w-10 h-8 flex items-center justify-center text-sm font-medium border-x border-border">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(item.productId, 1)}
                          disabled={
                            loading ||
                            (typeof maxStock === "number" && item.quantity >= maxStock)
                          }
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted disabled:opacity-50 transition text-sm"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        disabled={loading}
                        className="text-xs text-red-500 hover:text-red-600 font-medium hover:underline disabled:opacity-50 transition ml-2"
                      >
                        Kaldır
                      </button>
                      <button
                        onClick={() => void saveForLater(item.productId)}
                        disabled={loading}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium hover:underline disabled:opacity-50 transition ml-2 inline-flex items-center gap-1"
                      >
                        <Bookmark className="w-3 h-3" /> Sonra al
                      </button>
                      {user && (
                        <button
                          onClick={() => void moveToFavorites(item.productId)}
                          disabled={loading}
                          className="text-xs text-muted-foreground hover:text-foreground font-medium hover:underline disabled:opacity-50 transition ml-2 inline-flex items-center gap-1"
                        >
                          <Heart className="w-3 h-3" /> Favorilere taşı
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasSavedItems && (
          <div className="border border-border rounded-2xl overflow-hidden mt-6">
            <div className="bg-muted/30 px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Sonra Almak İstediklerim ({basket.savedItems.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {basket.savedItems.map((item) => {
                const image = item.pictureUrl || images[item.productId];
                return (
                  <div key={item.productId} className="flex items-center gap-4 p-5">
                    <Link
                      href={`/products/${item.productId}`}
                      className="relative flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
                    >
                      {image ? (
                        <Image
                          src={resolveMediaUrl(image)}
                          alt={item.productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <ImageOff className="h-6 w-6 text-muted-foreground/40" strokeWidth={1} />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.productId}`} className="text-sm font-medium hover:underline line-clamp-2">
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">{formatPrice(item.price)}</p>
                      <button
                        onClick={() => void moveToCart(item.productId)}
                        disabled={loading}
                        className="mt-2 text-xs font-medium text-foreground hover:underline disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" /> Sepete taşı
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="border border-border rounded-2xl overflow-hidden sticky top-24">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Özeti</h2>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Kupon kodu"
                disabled={Boolean(appliedCoupon)}
                className={`${inputClass} flex-1`}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={() => void clearCoupon()}
                  className="h-11 shrink-0 rounded-lg border border-border px-3 text-sm font-medium transition hover:border-foreground"
                >
                  Kaldır
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void applyCoupon()}
                  disabled={summaryLoading}
                  className="h-11 shrink-0 rounded-lg bg-foreground px-3 text-sm font-medium text-white transition hover:bg-foreground/85 disabled:opacity-50"
                >
                  Uygula
                </button>
              )}
            </div>
            {couponMessage && (
              <p
                className={`text-xs ${
                  appliedCoupon ? "text-success" : "text-muted-foreground"
                }`}
              >
                {couponMessage}
              </p>
            )}

            {threshold > 0 && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ücretsiz kargo</span>
                  <span>
                    {remainingForFree > 0
                      ? `${formatPrice(remainingForFree)} kaldı`
                      : "Hak kazandınız"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span className="font-medium">{formatPrice(displaySubtotal)}</span>
            </div>

            {(summary?.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>
                  İndirim
                  {summary?.appliedCouponCode
                    ? ` (${summary.appliedCouponCode})`
                    : summary?.appliedCampaignName
                      ? ` (${summary.appliedCampaignName})`
                      : ""}
                </span>
                <span className="font-medium">−{formatPrice(summary!.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kargo</span>
              <span className="font-medium text-success">
                {(summary?.freeShipping || (summary?.shippingCost ?? 0) <= 0) &&
                summary
                  ? "Ücretsiz"
                  : summary
                    ? formatPrice(summary.shippingCost)
                    : "Ödeme adımında"}
              </span>
            </div>

            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Toplam</span>
                <span className="text-xl font-bold">
                  {summaryLoading ? "…" : formatPrice(displayTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              disabled={!basket.items?.length}
              className="w-full mt-4 py-3 bg-foreground text-white rounded-lg font-medium hover:bg-foreground/85 transition disabled:opacity-50"
            >
              Siparişi Tamamla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
