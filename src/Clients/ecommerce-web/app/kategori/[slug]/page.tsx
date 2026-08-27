import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import {
  getCategories,
  getCategoryBySlug,
  categoryHref,
} from "@/lib/categories";
import { serverFetchJson } from "@/lib/server-fetch";
import {
  getImageUrl,
  PAGE_SIZE,
  type PagedResult,
  type Product,
} from "@/lib/catalog";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/jsonld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategori bulunamadı" };

  const title = category.metaTitle || category.name;
  const description =
    category.metaDescription ||
    `${category.name} kategorisindeki ürünler — ${category.productCount} ürün.`;
  const canonical = `/kategori/${category.slug ?? slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Yıldırım Store`,
      description,
      url: canonical,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Slug duzeltmesi oncesindeki adres istendiyse guncel adrese tasi; tek
  // kanonik URL kalir ve eski baglantilar kirilmaz.
  if (category.slug && category.slug !== slug) {
    permanentRedirect(`/kategori/${category.slug}`);
  }

  const [allCategories, products] = await Promise.all([
    getCategories(),
    serverFetchJson<PagedResult<Product>>(
      `/catalog/products/search?categoryId=${category.id}&page=1&pageSize=${PAGE_SIZE}`,
      {
        items: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 0,
      },
      { revalidate: 60 },
    ),
  ]);

  const children = allCategories
    .filter((c) => c.parentId === category.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const crumbLd = breadcrumbJsonLd(
    [
      { name: "Anasayfa", url: "/" },
      { name: "Ürünler", url: "/products" },
      { name: category.name, url: `/kategori/${slug}` },
    ],
    siteUrl,
  );
  const listLd = itemListJsonLd(
    category.name,
    products.items.map((p) => ({
      name: p.name,
      url: `/products/${p.id}`,
      image: getImageUrl(p),
    })),
    siteUrl,
  );

  return (
    <main className="bg-white text-foreground">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
      />

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
          <span className="font-medium text-foreground">{category.name}</span>
        </nav>

        <h1 className="font-display mb-2 text-3xl font-bold md:text-4xl">
          {category.name}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {category.productCount} ürün
        </p>

        {children.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2">
            {children.map((child) => (
              <Link
                key={child.id}
                href={categoryHref(child)}
                className="rounded-full border border-border px-4 py-1.5 text-sm transition hover:border-foreground hover:bg-muted"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {products.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-lg font-medium">Bu kategoride ürün yok</p>
            <Link
              href="/products"
              className="mt-4 inline-block text-sm font-medium underline"
            >
              Tüm ürünlere göz at
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {products.totalPages > 1 && (
          <div className="mt-10 text-center">
            <Link
              href={`/products?category=${category.id}`}
              className="inline-flex rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Tümünü gör ({products.total})
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
