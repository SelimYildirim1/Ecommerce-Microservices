"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

interface ProductProps {
  id: string;
  name: string;
  price: number;
}

export default function AddToCartButton({ product }: { product: ProductProps }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const { refreshCartCount } = useCart();
  const router = useRouter();

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    const apiBase = "http://localhost:8000";
    const userName = user.id;

    try {
      const getRes = await fetch(`${apiBase}/basket/${userName}`);
      const existing = getRes.ok ? await getRes.json() : { userName, items: [] };
      const items: { quantity: number; color: string; price: number; productId: string; productName: string }[] =
        Array.isArray(existing?.items) ? existing.items : [];

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

      const res = await fetch(`${apiBase}/basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, items }),
      });

      if (res.ok) {
        setAdded(true);
        await refreshCartCount();
        setTimeout(() => setAdded(false), 2000);
      } else {
        alert("Bir hata olustu!");
        console.error(await res.text());
      }
    } catch (error) {
      console.error("Baglanti Hatasi:", error);
      alert("Baglanti hatasi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className={`w-full py-2 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5
        ${added
          ? 'bg-success text-success-foreground'
          : 'bg-foreground text-white hover:bg-foreground/85'
        }
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
      `}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : added ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Eklendi
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Sepete Ekle
        </>
      )}
    </button>
  );
}
