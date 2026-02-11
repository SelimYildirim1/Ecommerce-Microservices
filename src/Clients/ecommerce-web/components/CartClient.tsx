"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

interface CartItem {
  quantity: number;
  color: string;
  price: number;
  productId: string;
  productName: string;
}

interface Basket {
  userName: string;
  items: CartItem[];
  totalPrice: number;
}

export default function CartClient({ initialBasket }: { initialBasket: Basket | null }) {
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
      const res = await fetch("http://localhost:8000/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        console.error("Sepet guncellenemedi:", errorText);
      }
    } catch (error) {
      console.error("Sepet guncellenemedi", error);
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
      <div className="text-center py-20 border border-border rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-1">Sepetiniz bos</h2>
        <p className="text-muted-foreground text-sm mb-6">Hemen alisverise baslayin!</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition">
          Alisverise Basla
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Product List */}
      <div className="lg:col-span-2">
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Urunler ({basket.items.length})
            </h2>
          </div>

          <div className="divide-y divide-border">
            {basket.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 p-5">
                {/* Product Image */}
                <Link
                  href={`/products/${item.productId}`}
                  className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0 hover:opacity-80 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-muted-foreground/40">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
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
                      Kaldir
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
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="border border-border rounded-xl overflow-hidden sticky top-24">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Siparis Ozeti</h2>
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
              <span className="font-medium text-success">Ucretsiz</span>
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
              Siparisi Tamamla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
