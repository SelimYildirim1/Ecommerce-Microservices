import Header from "@/components/Header";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductReviews from "@/components/ProductReviews";
import ProductQnA from "@/components/ProductQnA";
import ProductSpecs from "@/components/ProductSpecs";
import RelatedProducts from "@/components/RelatedProducts";
import InstallmentTable from "@/components/InstallmentTable";
import RecentlyViewed from "@/components/RecentlyViewed";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";
import StarRating from "@/components/StarRating";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  PackageX,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { serverFetchJson } from "@/lib/server-fetch";
import { getImageUrl, getPrice, type Product } from "@/lib/catalog";
import { getRelatedProducts } from "@/lib/brands";
import { getSiteSettings } from "@/lib/cms";
import { breadcrumbJsonLd } from "@/lib/jsonld";

async function getProduct(id: string): Promise<Product | null> {
  return serverFetchJson<Product | null>(`/catalog/products/${id}`, null, {
    revalidate: 60,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<import("next").Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Ürün bulunamadı" };
  const title = product.metaTitle || product.name;
  const description =
    product.metaDescription || product.description?.slice(0, 160);
  const image = getImageUrl(product);
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: {
      title,
      description: description ?? undefined,
      url: `/products/${product.id}`,
      type: "website",
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, related, settings] = await Promise.all([
    getProduct(id),
    getRelatedProducts(id, 8),
    getSiteSettings(),
  ]);

  if (!product) {
    return (
      <div className="bg-white text-gray-900">
        <Header />
        <main className="mx-auto max-w-[1600px] px-6 py-24 text-center md:px-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
            <PackageX className="h-9 w-9 text-gray-400" />
          </div>
          <h1 className="font-display mb-2 text-3xl font-bold">Ürün bulunamadı</h1>
          <p className="mb-6 text-gray-500">
            Aradığınız ürün mevcut değil veya kaldırılmış olabilir.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Anasayfaya dön
          </Link>
        </main>
      </div>
    );
  }

  const reviewCount = product.reviewCount ?? 0;
  const imageUrl = getImageUrl(product);
  const price = getPrice(product);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const brandSlug = product.brandName
    ? product.brandName
        .toLowerCase()
        .replace(/[ıİ]/g, "i")
        .replace(/[ğĞ]/g, "g")
        .replace(/[üÜ]/g, "u")
        .replace(/[şŞ]/g, "s")
        .replace(/[öÖ]/g, "o")
        .replace(/[çÇ]/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    : null;

  const sameCategory = related.filter((p) => p.categoryId === product.categoryId).slice(0, 4);
  const similar = related.slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description?.slice(0, 300) || undefined,
    image: imageUrl || undefined,
    sku: product.id,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.id}`,
      priceCurrency: "TRY",
      price: product.price,
      availability:
        (product.stock ?? 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    ...(reviewCount > 0 && product.averageRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.averageRating,
            reviewCount,
          },
        }
      : {}),
  };

  const crumbLd = breadcrumbJsonLd(
    [
      { name: "Anasayfa", url: "/" },
      { name: "Tüm Ürünler", url: "/products" },
      ...(product.categoryId && product.categoryName
        ? [
            {
              name: product.categoryName,
              url: `/products?category=${product.categoryId}`,
            },
          ]
        : []),
      { name: product.name, url: `/products/${product.id}` },
    ],
    siteUrl,
  );

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <RecentlyViewedTracker
        id={product.id}
        name={product.name}
        image={product.primaryImageUrl}
        price={price}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }}
      />

      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-[1600px] px-6 py-3 md:px-12">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/" className="transition-colors hover:text-gray-900">
              Anasayfa
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link href="/products" className="transition-colors hover:text-gray-900">
              Tüm Ürünler
            </Link>
            {product.categoryId && product.categoryName && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link
                  href={`/products?category=${product.categoryId}`}
                  className="transition-colors hover:text-gray-900"
                >
                  {product.categoryName}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[200px] truncate font-medium text-gray-900">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery
            images={product.images ?? []}
            fallbackUrl={getImageUrl(product)}
            alt={product.name}
          />

          <div className="flex flex-col">
            {product.brandName && (
              <Link
                href={brandSlug ? `/marka/${brandSlug}` : "/products"}
                className="w-fit text-sm font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:text-gray-900"
              >
                {product.brandName}
              </Link>
            )}

            <h1 className="font-display mt-1 text-3xl font-bold leading-tight lg:text-4xl">
              {product.name}
            </h1>

            {reviewCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <StarRating value={product.averageRating ?? 0} size="md" />
                <span className="text-sm text-gray-500">
                  {(product.averageRating ?? 0).toFixed(1)} ({reviewCount} değerlendirme)
                </span>
              </div>
            )}

            <p className="mt-2 text-xs text-gray-400">
              Ürün kodu: {product.id.substring(0, 8).toUpperCase()}
            </p>

            <div className="mt-6">
              <ProductPurchasePanel product={product} />
            </div>

            <InstallmentTable
              price={price}
              ratesJson={settings["commerce.installmentRates"]}
            />

            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">
                Ürün Açıklaması
              </h2>
              <p className="leading-relaxed text-gray-500">
                {product.description || "Bu ürün için henüz bir açıklama eklenmemiş."}
              </p>
            </div>

            <ProductSpecs product={product} />

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Feature icon={Truck} title="Ücretsiz Kargo" note="500 TL ve üzeri" />
              <Feature icon={RotateCcw} title="Kolay İade" note="14 gün içinde" />
              <Feature icon={ShieldCheck} title="Güvenli Ödeme" note="256-bit SSL" />
            </div>
          </div>
        </div>

        <ProductReviews productId={product.id} />
        <ProductQnA productId={product.id} />
        <RelatedProducts title="Benzer ürünler" products={similar} />
        <RelatedProducts title="Aynı kategoriden" products={sameCategory} />
      </main>

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream p-3">
      <Icon className="h-5 w-5 shrink-0 text-gray-600" />
      <div>
        <p className="text-xs font-semibold text-gray-900">{title}</p>
        <p className="text-[11px] text-gray-500">{note}</p>
      </div>
    </div>
  );
}
