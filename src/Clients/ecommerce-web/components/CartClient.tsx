"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

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

  // Sepet Toplamını Hesapla
  const calculateTotal = () => {
    if (!basket || !basket.items) return 0;
    return basket.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Sepeti Güncelleme Fonksiyonu (Backend'e POST atar)
  const updateBasket = async (updatedItems: CartItem[]) => {
    if (!basket) return;
    setLoading(true);

    try {
      // Sepet API genelde tüm listeyi tekrar ister (Overwrite mantığı)
      const res = await fetch("http://localhost:8000/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: basket.userName,
          items: updatedItems
        })
      });

      if (res.ok) {
        const updatedBasket = await res.json();
        // Eğer gönderdiğimiz items boşsa veya response'daki items boşsa, state'i boş items ile güncelle
        if (updatedItems.length === 0 || !updatedBasket.items || updatedBasket.items.length === 0) {
          setBasket({
            userName: basket.userName,
            items: [],
            totalPrice: 0
          });
        } else {
          setBasket(updatedBasket);
        }
        // Sepet sayısını güncelle (Header'daki sayıyı güncellemek için)
        await refreshCartCount();
        router.refresh(); // Server Component verisini de tazele
      } else {
        // Backend'den hata dönerse, hata mesajını göster
        const errorText = await res.text();
        console.error("Sepet güncellenemedi:", errorText);
        alert("Sepet güncellenemedi: " + errorText);
      }
    } catch (error) {
      console.error("Sepet güncellenemedi", error);
      alert("İşlem başarısız!");
    } finally {
      setLoading(false);
    }
  };

  // Ürün Silme
  const removeItem = async (productId: string) => {
    if (!basket) return;
    const newItems = basket.items.filter(i => i.productId !== productId);

    // Eğer sepet boşalırsa, boş array gönder
    if (newItems.length === 0) {
      await updateBasket([]);
    } else {
      await updateBasket(newItems);
    }
  };

  // Miktar Değiştirme
  const changeQuantity = async (productId: string, change: number) => {
    if (!basket) return;

    const newItems = basket.items
      .map(item => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + change;
          // Miktar 0 veya daha az olursa null döndür (filtreleme için)
          if (newQuantity < 1) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
      .filter((item): item is CartItem => item !== null); // null olanları filtrele

    // Eğer sepet boşalırsa, boş array gönder
    if (newItems.length === 0) {
      await updateBasket([]);
    } else {
      await updateBasket(newItems);
    }
  };

  if (!basket || !basket.items || basket.items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Sepetiniz Boş 😔</h2>
        <p className="text-muted-foreground mt-2">Hemen alışverişe başlayın!</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">Alışverişe Dön</a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sol Taraf: Ürün Listesi */}
      <div className="lg:col-span-2 space-y-4">
        {basket.items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-4">
              {/* Resim olmadığı için placeholder kutu */}
              <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                Ürün Resmi
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{item.productName}</h3>
                <p className="text-sm text-muted-foreground">Adet Fiyatı: {item.price} ₺</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Miktar Kontrolü */}
              <div className="flex items-center border border-border rounded-md">
                <button
                  onClick={() => changeQuantity(item.productId, -1)}
                  disabled={loading}
                  className="px-3 py-1 hover:bg-muted disabled:opacity-50"
                >-</button>
                <span className="px-3 py-1 font-medium">{item.quantity}</span>
                <button
                  onClick={() => changeQuantity(item.productId, 1)}
                  disabled={loading}
                  className="px-3 py-1 hover:bg-muted disabled:opacity-50"
                >+</button>
              </div>

              {/* Toplam ve Silme */}
              <div className="text-right">
                <p className="font-bold text-primary">{(item.price * item.quantity).toLocaleString('tr-TR')} ₺</p>
                <button
                  onClick={() => removeItem(item.productId)}
                  disabled={loading}
                  className="text-red-500 hover:text-red-600 text-sm font-medium hover:underline mt-1 disabled:opacity-50 transition"
                >
                  ✕ Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sağ Taraf: Sipariş Özeti */}
      <div className="lg:col-span-1">
        <div className="border border-border rounded-lg p-6 bg-card sticky top-4">
          <h2 className="text-xl font-bold mb-4 text-foreground">Sipariş Özeti</h2>

          <div className="flex justify-between mb-2 text-muted-foreground">
            <span>Ara Toplam</span>
            <span>{calculateTotal().toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex justify-between mb-4 text-muted-foreground">
            <span>Kargo</span>
            <span>0 ₺</span>
          </div>

          <div className="border-t border-border my-4 pt-4 flex justify-between items-center">
            <span className="text-lg font-bold text-foreground">Toplam</span>
            <span className="text-2xl font-bold text-primary">{calculateTotal().toLocaleString('tr-TR')} ₺</span>
          </div>

          <button
            onClick={() => router.push("/checkout")} 
            className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:opacity-90 transition shadow-lg"
          >
            Siparişi Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}