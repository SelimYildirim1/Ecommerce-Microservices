"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  findVariant,
  getVariantOptions,
  type Product,
  type Variant,
} from "@/lib/catalog";

type ProductVariantContextValue = {
  product: Product;
  activeVariants: Variant[];
  options: Record<string, string[]>;
  selection: Record<string, string>;
  setSelection: Dispatch<SetStateAction<Record<string, string>>>;
  selectedVariant: Variant | null;
};

const ProductVariantContext = createContext<ProductVariantContextValue | null>(
  null,
);

export function ProductVariantProvider({
  product,
  children,
}: {
  product: Product;
  children: ReactNode;
}) {
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.isActive),
    [product.variants],
  );
  const options = useMemo(
    () => getVariantOptions(activeVariants, product.attributes),
    [activeVariants, product.attributes],
  );
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.keys(options).map((key) => [key, options[key][0]])),
  );
  const selectedVariant = useMemo(
    () => findVariant(activeVariants, selection),
    [activeVariants, selection],
  );

  return (
    <ProductVariantContext.Provider
      value={{
        product,
        activeVariants,
        options,
        selection,
        setSelection,
        selectedVariant,
      }}
    >
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  return useContext(ProductVariantContext);
}
