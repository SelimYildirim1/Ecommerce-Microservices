import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductFilters, { SortSelect } from "@/components/ProductFilters";
import MobileFilterDrawer from "@/components/MobileFilterDrawer";
import ProductViewControls from "@/components/ProductViewControls";
import Pagination from "@/components/Pagination";
import { serverFetchJson } from "@/lib/server-fetch";
import {
  PAGE_SIZE,
  type PagedResult,
  type Product,
  type ProductFacets,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Ürünler",
  description: "Tüm ürünleri keşfedin — filtreleyin, sıralayın, karşılaştırın.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Ürünler | Yıldırım Store",
    description: "Tüm ürünleri keşfedin — filtreleyin, sıralayın, karşılaştırın.",
    url: "/products",
  },
};

const EMPTY_FACETS: ProductFacets = {
  categories: [],
  brands: [],
  minPrice: 0,
  maxPrice: 0,
};

const EMPTY_RESULT: PagedResult<Product> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  totalPages: 0,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolvePageSize(raw: string | undefined): number {
  const n = Number(raw ?? PAGE_SIZE);
  return [12, 24, 48].includes(n) ? n : PAGE_SIZE;
}

function buildQuery(searchParams: SearchParams): URLSearchParams {
  const query = new URLSearchParams();

  const map: Record<string, string> = {
    q: "search",
    category: "categoryId",
    brand: "brandId",
    minPrice: "minPrice",
    maxPrice: "maxPrice",
    sort: "sort",
  };

  for (const [urlKey, apiKey] of Object.entries(map)) {
    const value = first(searchParams[urlKey]);
    if (value) query.set(apiKey, value);
  }

  if (first(searchParams.inStock) === "true") query.set("inStockOnly", "true");

  const page = Number(first(searchParams.page) ?? "1");
  query.set("page", String(Number.isFinite(page) && page > 0 ? page : 1));
  query.set("pageSize", String(resolvePageSize(first(searchParams.pageSize))));

  return query;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = buildQuery(params);
  const view = first(params.view) === "list" ? "list" : "grid";

  const facetQuery = new URLSearchParams();
  const term = first(params.q);
  const category = first(params.category);
  if (term) facetQuery.set("search", term);
  if (category) facetQuery.set("categoryId", category);

  const [result, facets] = await Promise.all([
    serverFetchJson<PagedResult<Product>>(
      `/catalog/products/search?${query}`,
      EMPTY_RESULT,
      { revalidate: 60 },
    ),
    serverFetchJson<ProductFacets>(
      `/catalog/products/facets?${facetQuery}`,
      EMPTY_FACETS,
      { revalidate: 60 },
    ),
  ]);

  const linkParams: Record<string, string> = {};
  for (const key of [
    "q",
    "category",
    "brand",
    "minPrice",
    "maxPrice",
    "sort",
    "inStock",
    "view",
    "pageSize",
  ]) {
    const value = first(params[key]);
    if (value) linkParams[key] = value;
  }

  const heading = term ? `"${term}" için sonuçlar` : "Tüm Ürünler";

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main className="mx-auto max-w-[1600px] px-6 py-8 pb-28 md:px-12 md:pb-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">{heading}</span>
        </nav>

        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">{heading}</h1>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="hidden lg:block">
            <Suspense
              fallback={<div className="shimmer h-96 w-64 rounded-2xl" />}
            >
              <ProductFilters facets={facets} />
            </Suspense>
          </div>

          <section className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <MobileFilterDrawer facets={facets} />
                </Suspense>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{result.total}</span>{" "}
                  ürün bulundu
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Suspense fallback={<div className="shimmer h-9 w-32 rounded-lg" />}>
                  <ProductViewControls />
                </Suspense>
                <Suspense fallback={<div className="shimmer h-9 w-48 rounded-lg" />}>
                  <SortSelect />
                </Suspense>
              </div>
            </div>

            {result.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <SearchX className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Sonuç bulunamadı</p>
                <p className="mt-1 text-gray-500">
                  Farklı bir arama yapın veya filtreleri temizleyin.
                </p>
                <Link
                  href="/products"
                  className="mt-5 inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Tüm ürünleri gör
                </Link>
              </div>
            ) : (
              <>
                <div
                  className={
                    view === "list"
                      ? "flex flex-col gap-4"
                      : "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
                  }
                >
                  {result.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  params={linkParams}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
