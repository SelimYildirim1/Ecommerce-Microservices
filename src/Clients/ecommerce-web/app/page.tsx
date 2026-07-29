import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategoryStrip from "@/components/CategoryStrip";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";
import { PackageSearch, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getCategories, pickFeatured } from "@/lib/categories";
import { serverFetchJson } from "@/lib/server-fetch";
import type { PagedResult, Product } from "@/lib/catalog";

const FEATURED_COUNT = 8;
const NEW_ARRIVAL_COUNT = 10;

/**
 * Yeni arama ucu sayfali sonuc doner. Uc bir sebeple erisilemezse
 * eski /catalog/products listesine dusulur, vitrin bos kalmaz.
 */
async function getProducts(sort: string, pageSize: number): Promise<Product[]> {
  const paged = await serverFetchJson<PagedResult<Product> | null>(
    `/catalog/products/search?sort=${sort}&page=1&pageSize=${pageSize}`,
    null,
  );

  if (paged?.items?.length) return paged.items;

  const legacy = await serverFetchJson<unknown>("/catalog/products", []);
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
  const [featured, newArrivals, categories] = await Promise.all([
    getProducts("Rating", FEATURED_COUNT),
    getProducts("Newest", NEW_ARRIVAL_COUNT),
    getCategories(),
  ]);

  const featuredCategories = pickFeatured(categories);

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main>
        <HeroBanner />

        <CategoryStrip categories={featuredCategories} />

        {featured.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-6 pb-4 md:px-12">
            <SectionHeader
              title="Öne Çıkan Ürünler"
              actionLabel="Tümünü Gör"
              actionHref="/products?sort=Rating"
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
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
      </main>

    </div>
  );
}
