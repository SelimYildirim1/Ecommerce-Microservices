import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import ProductCard from "@/components/ProductCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import SectionHeader from "@/components/SectionHeader";
import CampaignCountdown from "@/components/CampaignCountdown";
import { PackageSearch, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getCategories, pickFeatured } from "@/lib/categories";
import { getBestsellers, getBrands, getDeals } from "@/lib/brands";
import { serverFetchJson } from "@/lib/server-fetch";
import type { PagedResult, Product } from "@/lib/catalog";

export const metadata: Metadata = {
  title: {
    absolute: "Yıldırım Store | Online Alışveriş",
  },
  description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Yıldırım Store | Online Alışveriş",
    description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
    url: "/",
    type: "website",
  },
};

const FEATURED_COUNT = 8;
const NEW_ARRIVAL_COUNT = 10;

type ActiveCampaign = {
  id: string;
  name: string;
  description?: string | null;
  discountType: string;
  value: number;
  validTo: string;
  minBasketAmount: number;
};

type FeaturedCoupon = {
  code: string;
  description?: string | null;
  discountType: string;
  value: number;
  minBasketAmount: number;
  validTo: string;
};

async function getProducts(sort: string, pageSize: number): Promise<Product[]> {
  const paged = await serverFetchJson<PagedResult<Product> | null>(
    `/catalog/products/search?sort=${sort}&page=1&pageSize=${pageSize}`,
    null,
    { revalidate: 60 },
  );

  if (paged?.items?.length) return paged.items;

  const legacy = await serverFetchJson<unknown>("/catalog/products", [], {
    revalidate: 60,
  });
  const items = Array.isArray(legacy)
    ? legacy
    : ((legacy as Record<string, unknown>)?.$values as unknown[]) ?? [];

  return (Array.isArray(items) ? items : []).slice(0, pageSize) as Product[];
}

const SERVICES = [
  { icon: Truck, title: "Ücretsiz Kargo", text: "500 TL ve üzeri siparişlerde" },
  { icon: RotateCcw, title: "14 Gün İade", text: "Koşulsuz iade hakkı" },
  { icon: ShieldCheck, title: "Güvenli Ödeme", text: "256-bit SSL koruması" },
  { icon: PackageSearch, title: "Aynı Gün Kargo", text: "16:00'ya kadar verilen siparişler" },
];

export default async function Home() {
  const [featured, newArrivals, categories, deals, bestsellers, brands, campaigns, coupons] =
    await Promise.all([
      getProducts("Rating", FEATURED_COUNT),
      getProducts("Newest", NEW_ARRIVAL_COUNT),
      getCategories(),
      getDeals(8),
      getBestsellers(8),
      getBrands(),
      serverFetchJson<ActiveCampaign[]>("/promotions/campaigns/active?take=3", []),
      serverFetchJson<FeaturedCoupon[]>("/promotions/coupons/featured?take=3", []),
    ]);

  const featuredCategories = pickFeatured(categories);
  const topCampaign = campaigns[0];
  const brandList = brands.slice(0, 12);

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main>
        <HeroBanner />

        <CategoryStrip categories={featuredCategories} />

        {coupons.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 pb-8 md:px-12">
            <div className="flex flex-wrap gap-3">
              {coupons.map((c) => (
                <div
                  key={c.code}
                  className="flex min-w-[220px] flex-1 items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-cream px-5 py-4"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Kupon
                    </p>
                    <p className="mt-0.5 text-lg font-bold tracking-wide">{c.code}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {c.description ||
                        (c.discountType === "Percentage"
                          ? `%${c.value} indirim`
                          : c.discountType === "FreeShipping"
                            ? "Ücretsiz kargo"
                            : `${c.value} TL indirim`)}
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="shrink-0 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white"
                  >
                    Kullan
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {topCampaign && (
          <section className="mx-auto max-w-[1600px] px-6 pb-10 md:px-12">
            <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-700 px-6 py-8 text-white md:flex-row md:items-center md:px-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                  Kampanya
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{topCampaign.name}</h2>
                {topCampaign.description && (
                  <p className="mt-1 max-w-xl text-sm text-white/70">{topCampaign.description}</p>
                )}
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className="text-xs text-white/60">Bitişe kalan</span>
                <CampaignCountdown endsAt={topCampaign.validTo} className="text-white" />
              </div>
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 pb-4 md:px-12">
            <SectionHeader
              title="Öne Çıkan Ürünler"
              actionLabel="Tümünü Gör"
              actionHref="/products?sort=Rating"
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i < 4}
                />
              ))}
            </div>
          </section>
        )}

        {deals.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 py-12 md:px-12">
            <SectionHeader
              title="İndirimdekiler"
              actionLabel="Tümünü Gör"
              actionHref="/products?sort=PriceAsc"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {deals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-[1600px] px-6 py-16 md:px-12">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-cream px-6 py-8 md:grid-cols-4 md:gap-8 md:px-10">
            {SERVICES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
                  <Icon className="h-5 w-5 text-gray-700" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="truncate text-xs text-gray-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {bestsellers.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 pb-12 md:px-12">
            <SectionHeader
              title="Çok Satanlar"
              actionLabel="Tümünü Gör"
              actionHref="/products?sort=Rating"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {bestsellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {brandList.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 pb-12 md:px-12">
            <SectionHeader title="Markalar" actionLabel="Tümü" actionHref="/products" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {brandList.map((b) => (
                <Link
                  key={b.id}
                  href={`/marka/${b.slug}`}
                  className="flex h-20 items-center justify-center rounded-xl border border-border bg-white px-3 text-center text-sm font-medium text-gray-700 transition hover:border-foreground/30 hover:shadow-sm"
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto mb-20 max-w-[1600px] px-6 md:px-12">
          <SectionHeader
            title="Yeni Gelenler"
            actionLabel="Tümünü Gör"
            actionHref="/products"
          />

          {newArrivals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="text-lg font-medium">Henüz ürün eklenmemiş</p>
              <p className="mt-1 text-gray-500">Yakında yeni ürünler eklenecek.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <RecentlyViewed />
      </main>
    </div>
  );
}
