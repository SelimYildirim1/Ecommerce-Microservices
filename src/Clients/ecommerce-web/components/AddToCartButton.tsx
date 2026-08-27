"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { API_URL, authHeaders } from "@/lib/api";
import { ensureGuestSession } from "@/lib/guest-session";
import { notify, parseApiError } from "@/lib/feedback";

interface ProductProps {
  id: string;
  name: string;
  price: number;
  /** Secilen varyantin etiketi (orn. "Siyah / M"). Verilmezse "Standart". */
  color?: string;
  /** Sepet ve siparis satirlarinda gosterilecek birincil gorsel. */
  pictureUrl?: string | null;
  /** Secilen katalog varyant id'si (opsiyonel, geriye uyumlu). */
  variantId?: string | null;
}

interface Props {
  product: ProductProps;
  /** Detay sayfasindaki adet secici ile kullanilir. */
  quantity?: number;
  disabled?: boolean;
  label?: string;
  onAdded?: () => void;
  /** `icon` urun kartindaki kompakt kare buton, digerleri tam genislik. */
  variant?: "solid" | "outline" | "icon";
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<Props["variant"]>, string> = {
  solid: "w-full py-2.5 rounded-lg bg-foreground text-white hover:bg-gray-800",
  outline:
    "w-full py-2.5 rounded-lg border border-border text-foreground hover:border-foreground hover:bg-muted",
  // Dokunmatikte 44px hedef; masaustunde kart duzenini bozmamak icin 40px
  icon: "h-11 w-11 shrink-0 sm:h-10 sm:w-10 rounded-full bg-foreground text-white shadow-sm hover:bg-gray-800 hover:shadow-md",
};

/** Heroicons v2 "shopping-cart" — butonun sepete ekleme islevini net anlatir. */
function CartIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
}

interface BasketItem {
  quantity: number;
  color: string;
  price: number;
  productId: string;
  productName: string;
  pictureUrl?: string | null;
  variantId?: string | null;
}

export default function AddToCartButton({
  product,
  quantity = 1,
  disabled = false,
  label,
  onAdded,
  variant = "solid",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const { refreshCartCount } = useCart();

  const handleAddToCart = async () => {
    setLoading(true);
    const apiBase = API_URL;

    try {
      let userName = user?.id;
      if (!userName) {
        const guest = await ensureGuestSession();
        userName = guest?.guestId;
      }
      if (!userName) {
        notify.error("Sepet oturumu açılamadı. Lütfen sayfayı yenileyin.");
        return;
      }

      const color = product.color?.trim() || "Standart";
      const amount = Math.max(1, quantity);
      const variantId = product.variantId ?? null;

      const getRes = await fetch(`${apiBase}/basket/${userName}`, {
        headers: authHeaders(),
      });
      const existing = getRes.ok ? await getRes.json() : { userName, items: [] };
      const items: BasketItem[] = Array.isArray(existing?.items) ? existing.items : [];

      // Ayni urunun farkli varyanti sepette ayri satir olur
      const idx = items.findIndex(
        (i) =>
          i.productId === product.id &&
          (i.color ?? "Standart") === color &&
          (i.variantId ?? null) === variantId,
      );

      if (idx >= 0) {
        items[idx].quantity += amount;
        items[idx].pictureUrl ??= product.pictureUrl ?? null;
        items[idx].variantId ??= variantId;
      } else {
        items.push({
          quantity: amount,
          color,
          price: product.price,
          productId: product.id,
          productName: product.name,
          pictureUrl: product.pictureUrl ?? null,
          variantId,
        });
      }

      const res = await fetch(`${apiBase}/basket`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userName, items }),
      });

      if (res.ok) {
        setAdded(true);
        await refreshCartCount();
        onAdded?.();
        notify.success("Ürün sepete eklendi.");
        setTimeout(() => setAdded(false), 2000);
      } else {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "Ürün sepete eklenemedi. Lütfen tekrar deneyin."));
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const compact = variant === "icon";
  const iconSize = compact ? "h-[18px] w-[18px]" : "h-4 w-4";

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || disabled}
      title={compact ? "Sepete ekle" : undefined}
      aria-label={compact ? "Sepete ekle" : undefined}
      className={`flex items-center justify-center gap-1.5 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100
        ${added ? "bg-success text-success-foreground hover:bg-success" : ""}
        ${VARIANT_CLASSES[variant]}
        ${loading ? "cursor-wait" : "cursor-pointer"}
        ${className}
      `}
    >
      {loading ? (
        <svg className={`animate-spin ${iconSize}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : added ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={iconSize}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {!compact && "Eklendi"}
        </>
      ) : (
        <>
          <CartIcon className={iconSize} />
          {!compact && (label ?? "Sepete Ekle")}
        </>
      )}
    </button>
  );
}
