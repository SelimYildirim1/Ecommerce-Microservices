import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductFilters, { SortSelect } from "@/components/ProductFilters";
import Pagination from "@/components/Pagination";
import { serverFetchJson } from "@/lib/server-fetch";
import {
  PAGE_SIZE,
  type PagedResult,
  type Product,
  type ProductFacets,
} from "@/lib/catalog";

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

/** URL parametrelerini Catalog.API'nin bekledigi sorgu dizisine cevirir. */
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
  query.set("pageSize", String(PAGE_SIZE));

  return query;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = buildQuery(params);

  const facetQuery = new URLSearchParams();
  const term = first(params.q);
  const category = first(params.category);
  if (term) facetQuery.set("search", term);
  if (category) facetQuery.set("categoryId", category);

  const [result, facets] = await Promise.all([
    serverFetchJson<PagedResult<Product>>(
      `/catalog/products/search?${query}`,
      EMPTY_RESULT,
    ),
    serverFetchJson<ProductFacets>(
      `/catalog/products/facets?${facetQuery}`,
      EMPTY_FACETS,
    ),
  ]);

  // Sayfalama linkleri sayfa disindaki tum filtreleri korumali
  const linkParams: Record<string, string> = {};
  for (const key of ["q", "category", "brand", "minPrice", "maxPrice", "sort", "inStock"]) {
    const value = first(params[key]);
    if (value) linkParams[key] = value;
  }

  const heading = term ? `"${term}" için sonuçlar` : "Tüm Ürünler";

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">{heading}</span>
        </nav>

        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">{heading}</h1>

        <div className="flex flex-col gap-8 lg:flex-row">
          <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-gray-50 lg:w-64" />}>
            <ProductFilters facets={facets} />
          </Suspense>

          <section className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{result.total}</span> ürün bulundu
              </p>
              <Suspense fallback={<div className="h-9 w-48 rounded-lg bg-gray-50" />}>
                <SortSelect />
              </Suspense>
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
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
