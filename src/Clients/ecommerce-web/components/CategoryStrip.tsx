import Link from "next/link";
import { resolveMediaUrl } from "@/lib/catalog";
import type { StorefrontCategory } from "@/lib/categories";
import SectionHeader from "./SectionHeader";

/** Ana sayfadaki daire gorselli kategori seridi. */
export default function CategoryStrip({
  categories,
}: {
  categories: StorefrontCategory[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-6 py-16 md:px-12">
      <SectionHeader
        title="Kategoriler"
        actionLabel="Tüm Kategoriler"
        actionHref="/products"
      />

      <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.id}`}
            className="group flex flex-col items-center gap-4"
          >
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-50 transition-all duration-300 group-hover:shadow-md">
              <img
                src={resolveMediaUrl(category.imageUrl!)}
                alt={category.name}
                className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent" />
            </div>

            <span className="text-center text-sm font-medium text-gray-800">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
