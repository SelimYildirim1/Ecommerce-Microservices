import SectionHeader from "./SectionHeader";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/catalog";

export default function RelatedProducts({
  title = "Benzer ürünler",
  products,
}: {
  title?: string;
  products: Product[];
}) {
  if (!products.length) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <SectionHeader title={title} />
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
