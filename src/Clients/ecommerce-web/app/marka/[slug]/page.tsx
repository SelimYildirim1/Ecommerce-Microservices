import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getBrandBySlug } from "@/lib/brands";
import { resolveMediaUrl } from "@/lib/catalog";
import { serverFetchJson } from "@/lib/server-fetch";
import { PAGE_SIZE, type PagedResult, type Product } from "@/lib/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marka bulunamadı" };

  // Site adini kok layout'taki title template'i ekler; burada tekrar
  // eklenirse basligin sonunda iki kez cikar.
  const title = brand.metaTitle || brand.name;
  const description =
    brand.metaDescription ||
    brand.description?.slice(0, 160) ||
    `${brand.name} markalı ürünler.`;

  return {
    title,
    description,
    alternates: { canonical: `/marka/${brand.slug ?? slug}` },
    openGraph: {
      title: `${title} | Yıldırım Store`,
      description,
      url: `/marka/${brand.slug ?? slug}`,
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  // Slug duzeltmesi oncesindeki adres istendiyse guncel adrese tasi.
  if (brand.slug && brand.slug !== slug) {
    permanentRedirect(`/marka/${brand.slug}`);
  }

  const products = await serverFetchJson<PagedResult<Product>>(
    `/catalog/products/search?brandId=${brand.id}&page=${page}&pageSize=${PAGE_SIZE}`,
    {
      items: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
    },
  );

  const logo = brand.logoUrl ? resolveMediaUrl(brand.logoUrl) : null;

  return (
    <main className="bg-white text-foreground">
      <Header />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/products" className="hover:text-foreground">
            Ürünler
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{brand.name}</span>
        </nav>

        <div className="mb-8 flex flex-wrap items-center gap-4">
          {logo && (
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-cream">
              <img src={logo} alt={brand.name} className="max-h-12 max-w-12 object-contain" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{brand.name}</h1>
            {brand.description && (
              <p className="mt-2 max-w-2xl text-muted-foreground">{brand.description}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {products.total} ürün
            </p>
          </div>
        </div>

        {products.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
            Bu markada henüz ürün yok.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {products.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {products.totalPages > 1 && (
              <div className="mt-10 flex justify-center gap-2">
                {Array.from({ length: products.totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Link
                      key={p}
                      href={`/marka/${slug}?page=${p}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ${
                        p === products.page
                          ? "bg-foreground text-white"
                          : "bg-cream text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </Link>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
