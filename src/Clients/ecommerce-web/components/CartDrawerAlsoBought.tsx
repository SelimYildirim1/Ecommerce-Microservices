"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import { useCartDrawer } from "@/context/CartDrawerContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getRelatedProducts, searchProducts } from "@/lib/client-api";
import { getImageUrl, getPrice, type Product } from "@/lib/catalog";

/** Sepetteki ürünlerle aynı kategoriden / markadan öneriler. */
export default function CartDrawerAlsoBought({
  productIds,
}: {
  productIds: string[];
}) {
  const tCart = useTranslations("Cart");
  const { closeDrawer } = useCartDrawer();
  const { formatPrice } = useCurrency();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const inCart = new Set(productIds);

    (async () => {
      setLoading(true);
      const collected: Product[] = [];

      const pushUnique = (list: Product[]) => {
        for (const p of list) {
          if (!p?.id || inCart.has(p.id)) continue;
          if (collected.some((c) => c.id === p.id)) continue;
          collected.push(p);
        }
      };

      for (const id of productIds.slice(0, 3)) {
        if (collected.length >= 8) break;
        try {
          const related = await getRelatedProducts(id, 8);
          if (cancelled) return;
          if (Array.isArray(related)) pushUnique(related);
        } catch {
          /* öneri opsiyonel */
        }
      }

      if (collected.length < 4) {
        try {
          const result = await searchProducts(
            new URLSearchParams({ sort: "Rating", page: "1", pageSize: "8" }),
          );
          if (!cancelled && Array.isArray(result.items)) pushUnique(result.items);
        } catch {
          /* fallback opsiyonel */
        }
      }

      if (!cancelled) {
        setProducts(collected.slice(0, 8));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productIds.join(",")]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-also-card]");
    const step = card ? card.offsetWidth + 10 : 140;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (!loading && products.length === 0) return null;

  return (
    <div className="border-t border-gray-100 px-5 pb-5 pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{tCart("alsoBought")}</h3>
        {products.length > 2 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              aria-label="Önceki ürünler"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              aria-label="Sonraki ürünler"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                data-also-card
                className="w-[132px] shrink-0 animate-pulse rounded-xl border border-gray-100 p-1.5"
              >
                <div className="aspect-square rounded-lg bg-gray-100" />
                <div className="mt-2 h-3 w-full rounded bg-gray-100" />
                <div className="mt-1.5 h-3.5 w-16 rounded bg-gray-100" />
              </div>
            ))
          : products.map((product) => {
              const imageUrl = getImageUrl(product);
              const price = getPrice(product);
              return (
                <div
                  key={product.id}
                  data-also-card
                  className="w-[132px] shrink-0 snap-start overflow-hidden rounded-xl border border-gray-100 bg-white"
                >
                  <Link
                    href={`/products/${product.id}`}
                    onClick={closeDrawer}
                    className="relative block aspect-square overflow-hidden bg-gray-50"
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="132px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <ImageOff className="h-6 w-6 text-gray-300" />
                      </span>
                    )}
                  </Link>
                  <div className="px-2 pb-2 pt-1.5">
                    <Link
                      href={`/products/${product.id}`}
                      onClick={closeDrawer}
                      className="line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-gray-700 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <p className="text-[13px] font-semibold text-gray-900">
                        {formatPrice(price)}
                      </p>
                      <AddToCartButton
                        product={{
                          id: product.id,
                          name: product.name,
                          price,
                          pictureUrl: product.primaryImageUrl,
                        }}
                        variant="icon"
                        className="!h-8 !w-8 !rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
