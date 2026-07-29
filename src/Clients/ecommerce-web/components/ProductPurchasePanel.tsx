"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "./AddToCartButton";
import FavoriteButton from "./FavoriteButton";
import {
  attributeLabel,
  describeVariant,
  findVariant,
  formatPrice,
  getPrice,
  getTotalStock,
  getVariantOptions,
  type Product,
  type Variant,
} from "@/lib/catalog";

/**
 * Varyant secimi, adet ve sepete ekleme. Varyant tanimlanmamis urunlerde
 * secim alanlari gizlenir ve panel eski davranisi korur.
 */
export default function ProductPurchasePanel({ product }: { product: Product }) {
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  );

  const options = useMemo(() => getVariantOptions(activeVariants), [activeVariants]);
  const optionKeys = Object.keys(options);

  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(optionKeys.map((key) => [key, options[key][0]])),
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant: Variant | null = useMemo(
    () => findVariant(activeVariants, selection),
    [activeVariants, selection],
  );

  const price = selectedVariant ? Number(selectedVariant.price) : getPrice(product);
  const stock = selectedVariant
    ? Number(selectedVariant.stockQuantity)
    : getTotalStock(product);

  const outOfStock = stock <= 0;
  const unavailable = optionKeys.length > 0 && !selectedVariant;

  /** Secilen kombinasyonun stokta olup olmadigini butonlarda gostermek icin. */
  const isCombinationAvailable = (key: string, value: string) => {
    const candidate = { ...selection, [key]: value };
    const variant = findVariant(activeVariants, candidate);
    return Boolean(variant && variant.stockQuantity > 0);
  };

  return (
    <div>
      <div className="pb-6 border-b border-border">
        <span className="text-3xl lg:text-4xl font-bold text-foreground">
          {formatPrice(price)}
        </span>
        {selectedVariant && (
          <p className="text-xs text-muted-foreground mt-2">
            Stok kodu: {selectedVariant.sku}
          </p>
        )}
      </div>

      {optionKeys.length > 0 && (
        <div className="mt-6 space-y-5">
          {optionKeys.map((key) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground">{attributeLabel(key)}</h3>
                <span className="text-sm text-muted-foreground">{selection[key]}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {options[key].map((value) => {
                  const active = selection[key] === value;
                  const available = isCombinationAvailable(key, value);

                  return (
                    <button
                      key={value}
                      onClick={() => setSelection((prev) => ({ ...prev, [key]: value }))}
                      className={`px-4 py-2 rounded-lg border text-sm transition
                        ${active
                          ? "border-foreground bg-foreground text-white font-medium"
                          : "border-border hover:border-foreground"
                        }
                        ${!available && !active ? "opacity-40 line-through" : ""}`}
                      title={available ? value : `${value} - stokta yok`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        {outOfStock || unavailable ? (
          <>
            <div className="w-2 h-2 rounded-full bg-danger" />
            <span className="text-sm text-danger">
              {unavailable ? "Bu kombinasyon mevcut değil" : "Stokta yok"}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">
              Stokta {stock > 10 ? "mevcut" : `son ${stock} adet`}
            </span>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm font-medium">Adet</span>
        <div className="flex items-center border border-border rounded-lg">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Adet azalt"
            className="w-9 h-9 flex items-center justify-center hover:bg-muted disabled:opacity-40 transition"
          >
            -
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))}
            disabled={quantity >= stock}
            aria-label="Adet artır"
            className="w-9 h-9 flex items-center justify-center hover:bg-muted disabled:opacity-40 transition"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md">
        <div className="flex-1">
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              price,
              color: describeVariant(selectedVariant),
              pictureUrl: product.primaryImageUrl,
            }}
            quantity={quantity}
            disabled={outOfStock || unavailable}
            label={outOfStock ? "Stokta yok" : "Sepete Ekle"}
          />
        </div>
        <FavoriteButton productId={product.id} variant="inline" />
      </div>
    </div>
  );
}
