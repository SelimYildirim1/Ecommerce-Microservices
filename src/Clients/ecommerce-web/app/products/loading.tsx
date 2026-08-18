import Header from "@/components/Header";
import { ProductCardSkeletonGrid, ShimmerBar } from "@/components/ProductCardSkeleton";

/** Ürün listesi yüklenirken iskelet. */
export default function ProductsLoading() {
  return (
    <div className="bg-white text-gray-900">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 py-8 pb-28 md:px-12 md:pb-8">
        <ShimmerBar className="mb-4 h-4 w-40 rounded" />
        <ShimmerBar className="mb-8 h-10 w-64 rounded-lg" />

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="hidden lg:block">
            <ShimmerBar className="h-96 w-64 rounded-2xl" />
          </div>

          <section className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <ShimmerBar className="h-5 w-32 rounded" />
              <div className="flex gap-2">
                <ShimmerBar className="h-9 w-32 rounded-lg" />
                <ShimmerBar className="h-9 w-48 rounded-lg" />
              </div>
            </div>

            <ProductCardSkeletonGrid
              count={8}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
