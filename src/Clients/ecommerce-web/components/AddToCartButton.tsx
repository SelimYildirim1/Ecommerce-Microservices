"use client"; // <--- BU SATIR ŞART!

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

// Butona dışarıdan hangi verilerin geleceğini tanımlıyoruz
interface ProductProps {
  id: string;
  name: string;
  price: number;
}

export default function AddToCartButton({ product }: { product: ProductProps }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { refreshCartCount } = useCart();
  const router = useRouter();

  const handleAddToCart = async () => {
    // Kullanıcı giriş yapmamışsa uyarı ver ve login sayfasına yönlendir
    if (!user) {
      alert("⚠️ Sepete eklemek için lütfen giriş yapın!");
      router.push("/login");
      return;
    }

    setLoading(true);
    // Tarayıcı istekleri her zaman host'tan gider; Gateway'e localhost:8000 ile eriş
    const apiBase = "http://localhost:8000";
    const userName = user.id; // Auth'dan kullanıcı ID'sini alıyoruz

    try {
      // 1) Mevcut sepeti al (Basket API POST tüm sepeti değiştiriyor, merge yok)
      const getRes = await fetch(`${apiBase}/basket/${userName}`);
      const existing = getRes.ok ? await getRes.json() : { userName, items: [] };
      const items: { quantity: number; color: string; price: number; productId: string; productName: string }[] =
        Array.isArray(existing?.items) ? existing.items : [];

      // 2) Aynı ürün varsa adedi artır, yoksa yeni ekle
      const idx = items.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        items[idx].quantity += 1;
      } else {
        items.push({
          quantity: 1,
          color: "Standart",
          price: product.price,
          productId: product.id,
          productName: product.name,
        });
      }

      // 3) Güncel sepeti POST ile gönder
      const res = await fetch(`${apiBase}/basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, items }),
      });

      if (res.ok) {
        alert("✅ Ürün sepete eklendi!");
        // Sepet sayısını güncelle (sayfa yenilenmeden)
        await refreshCartCount();
      } else {
        alert("❌ Bir hata oluştu!");
        console.error(await res.text());
      }
    } catch (error) {
      console.error("Bağlantı Hatası:", error);
      alert("Bağlantı hatası!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleAddToCart} 
      disabled={loading}
      className={`bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:opacity-90 transition disabled:opacity-50 ${loading ? 'cursor-wait' : ''}`}
    >
      {loading ? "Ekleniyor..." : "Sepete Ekle"}
    </button>
  );
}