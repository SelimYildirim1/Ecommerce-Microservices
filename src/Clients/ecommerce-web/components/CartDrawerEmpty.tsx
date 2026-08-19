"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useCartDrawer } from "@/context/CartDrawerContext";
import { useCurrency } from "@/context/CurrencyContext";
import { searchProducts } from "@/lib/client-api";
import { getImageUrl, getPrice, type Product } from "@/lib/catalog";
import FavoriteButton from "./FavoriteButton";

/** Sepet cekmecesinin bos hali: gorsel, CTA ve one cikan urunler. */
export default function CartDrawerEmpty() {
  const tCart = useTranslations("Cart");
  const { closeDrawer } = useCartDrawer();
  const { formatPrice } = useCurrency();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams({
          sort: "Rating",
          page: "1",
          pageSize: "8",
        });
        const result = await searchProducts(params);
        if (!cancelled) setProducts(result.items ?? []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-featured-card]");
    const step = card ? card.offsetWidth + 10 : 130;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <Image
          src="/images/empty-cart.png"
          alt=""
          width={280}
          height={210}
          priority
          className="mb-5 h-auto w-[188px] select-none object-contain"
          aria-hidden
        />
        <h3 className="font-display text-[22px] font-bold leading-snug text-foreground">
          {tCart("emptyTitle")}
        </h3>
        <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
          {tCart("emptyHint")}
        </p>
        <Link
          href="/products"
          onClick={closeDrawer}
          className="mt-6 flex h-12 w-full max-w-sm items-center justify-center rounded-xl bg-foreground text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-foreground/90"
        >
          {tCart("startShopping")}
        </Link>
      </div>

      {(loading || products.length > 0) && (
        <div className="border-t border-border px-5 pb-6 pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="font-display text-lg font-bold">{tCart("featured")}</h4>
            <div className="flex items-center gap-2">
              <Link
                href="/products?sort=Rating"
                onClick={closeDrawer}
                className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                {tCart("seeAll")}
                <span aria-hidden> &gt;</span>
              </Link>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Önceki ürünler"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-gray-500 transition hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Sonraki ürünler"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-gray-500 transition hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loading
              ? [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    data-featured-card
                    className="w-[118px] shrink-0 snap-start animate-pulse rounded-xl border border-border p-1.5"
                  >
                    <div className="aspect-square rounded-lg bg-muted" />
                    <div className="mt-2 h-3 w-full rounded bg-muted" />
                    <div className="mt-1.5 h-3.5 w-16 rounded bg-muted" />
                  </div>
                ))
              : products.map((product) => {
                  const imageUrl = getImageUrl(product);
                  const price = getPrice(product);

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      onClick={closeDrawer}
                      data-featured-card
                      className="group w-[118px] shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-white transition hover:border-gray-300 hover:shadow-sm"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-50">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            sizes="118px"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageOff className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                        <FavoriteButton productId={product.id} size="sm" />
                      </div>
                      <div className="px-2 pb-2.5 pt-2">
                        <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-gray-700">
                          {product.name}
                        </p>
                        <p className="mt-1.5 text-[13px] font-bold text-foreground">
                          {formatPrice(price)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}
