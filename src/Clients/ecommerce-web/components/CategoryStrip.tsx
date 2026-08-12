import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/catalog";
import { categoryHref, type StorefrontCategory } from "@/lib/categories";
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

      <div className="grid grid-cols-3 gap-x-5 gap-y-8 md:grid-cols-8 md:gap-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={categoryHref(category)}
            className="group flex flex-col items-center gap-3 md:gap-4"
          >
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-50 transition-all duration-300 group-hover:shadow-md md:h-24 md:w-24">
              {category.imageUrl ? (
                <Image
                  src={resolveMediaUrl(category.imageUrl)}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 80px, 96px"
                  className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-110"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent" />
            </div>

            <span className="text-center text-sm font-medium leading-snug text-gray-800">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
