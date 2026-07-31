"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { ImageOff, ShoppingBag } from "lucide-react";
import { API_URL, authHeaders } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/catalog";
import { notify, parseApiError } from "@/lib/feedback";

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
  totalPrice: number;
}

export default function CartClient({
  initialBasket,
  images = {},
}: {
  initialBasket: Basket | null;
  /** Urun kimligine gore birincil gorsel; sepet servisi gorsel tutmadigi icin disaridan gelir. */
  images?: Record<string, string>;
}) {
  const [basket, setBasket] = useState<Basket | null>(initialBasket);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshCartCount } = useCart();

  const calculateTotal = () => {
    if (!basket || !basket.items) return 0;
    return basket.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const updateBasket = async (updatedItems: CartItem[]) => {
    if (!basket) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/basket`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userName: basket.userName, items: updatedItems })
      });

      if (res.ok) {
        const updatedBasket = await res.json();
        if (updatedItems.length === 0 || !updatedBasket.items || updatedBasket.items.length === 0) {
          setBasket({ userName: basket.userName, items: [], totalPrice: 0 });
        } else {
          setBasket(updatedBasket);
        }
        await refreshCartCount();
        router.refresh();
      } else {
        const errorText = await res.text();
        notify.error(parseApiError(errorText, "Sepet güncellenemedi."));
      }
    } catch (error) {
      console.error("Sepet guncellenemedi", error);
      notify.error("Sunucuya bağlanılamadı. Sepet güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (productId: string) => {
    if (!basket) return;
    const newItems = basket.items.filter(i => i.productId !== productId);
    await updateBasket(newItems);
  };

  const changeQuantity = async (productId: string, change: number) => {
    if (!basket) return;
    const newItems = basket.items
      .map(item => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity < 1) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null);
    await updateBasket(newItems);
  };

  if (!basket || !basket.items || basket.items.length === 0) {
    return (
      <div className="text-center py-20 border border-border rounded-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-xl font-bold mb-1">Sepetiniz boş</h2>
        <p className="text-muted-foreground text-sm mb-6">Hemen alışverişe başlayın!</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition">
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Product List */}
      <div className="lg:col-span-2">
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Ürünler ({basket.items.length})
            </h2>
          </div>

          <div className="divide-y divide-border">
            {basket.items.map((item) => {
              const image = item.pictureUrl || images[item.productId];

              return (
              <div key={item.productId} className="flex items-center gap-4 p-5">
                {/* Product Image */}
                <Link
                  href={`/products/${item.productId}`}
                  className="w-20 h-24 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border shrink-0 hover:opacity-80 transition"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(image)}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="w-8 h-8 text-muted-foreground/40" strokeWidth={1} />
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`} className="text-sm font-medium hover:underline line-clamp-2">
                    {item.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    Birim: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price)}
                  </p>

                  {/* Quantity Control */}
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
                        disabled={loading}
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
                  </div>
                </div>

                {/* Item Total */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * item.quantity)}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="border border-border rounded-2xl overflow-hidden sticky top-24">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Özeti</h2>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span className="font-medium">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculateTotal())}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kargo</span>
              <span className="font-medium text-success">Ücretsiz</span>
            </div>

            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Toplam</span>
                <span className="text-xl font-bold">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculateTotal())}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="w-full mt-4 py-3 bg-foreground text-white rounded-lg font-medium hover:bg-foreground/85 transition"
            >
              Siparişi Tamamla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
