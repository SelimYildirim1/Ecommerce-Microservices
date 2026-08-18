import Header from "@/components/Header";
import { ProductCardSkeletonGrid, ShimmerBar } from "@/components/ProductCardSkeleton";

/** Ana sayfa yüklenirken ürün kartı shimmer iskeleti. */
export default function HomeLoading() {
  return (
    <div className="bg-white text-gray-900">
      <Header />
      <main>
        <div className="shimmer h-[62vh] min-h-[460px] w-full" />

        <section className="mx-auto max-w-[1600px] px-6 py-16 md:px-12">
          <ShimmerBar className="mb-8 h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-3 gap-x-5 gap-y-8 md:grid-cols-8 md:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="shimmer h-20 w-20 rounded-full md:h-24 md:w-24" />
                <ShimmerBar className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-6 pb-12 md:px-12">
          <ShimmerBar className="mb-8 h-8 w-56 rounded-lg" />
          <ProductCardSkeletonGrid count={8} />
        </section>

        <section className="mx-auto max-w-[1600px] px-6 pb-20 md:px-12">
          <ShimmerBar className="mb-8 h-8 w-44 rounded-lg" />
          <ProductCardSkeletonGrid count={8} />
        </section>
      </main>
    </div>
  );
}
