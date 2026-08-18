import Header from "@/components/Header";
import { ProductCardSkeletonGrid, ShimmerBar } from "@/components/ProductCardSkeleton";

/** Ürün detay yüklenirken iskelet. */
export default function ProductDetailLoading() {
  return (
    <div className="bg-white text-gray-900">
      <Header />
      <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-12">
        <ShimmerBar className="mb-8 h-4 w-64 rounded" />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-3">
            <div className="shimmer aspect-[4/3] rounded-2xl" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer h-20 w-24 rounded-xl" />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <ShimmerBar className="h-3 w-24 rounded" />
            <ShimmerBar className="h-10 w-4/5 rounded-lg" />
            <ShimmerBar className="h-4 w-32 rounded" />
            <ShimmerBar className="h-12 w-40 rounded-lg" />
            <div className="space-y-2 pt-4">
              <ShimmerBar className="h-4 w-full rounded" />
              <ShimmerBar className="h-4 w-5/6 rounded" />
              <ShimmerBar className="h-4 w-2/3 rounded" />
            </div>
            <div className="flex gap-3 pt-4">
              <ShimmerBar className="h-11 flex-1 rounded-lg" />
              <ShimmerBar className="h-11 w-36 rounded-lg" />
            </div>
          </div>
        </div>

        <section className="mt-14 border-t border-border pt-10">
          <ShimmerBar className="mb-8 h-8 w-44 rounded-lg" />
          <ProductCardSkeletonGrid count={4} />
        </section>
      </div>
    </div>
  );
}
