import Header from "@/components/Header";
import { ProductCardSkeletonGrid, ShimmerBar } from "@/components/ProductCardSkeleton";

/** Marka sayfası yüklenirken iskelet. */
export default function BrandLoading() {
  return (
    <div className="bg-white text-foreground">
      <Header />
      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <ShimmerBar className="mb-6 h-4 w-48 rounded" />
        <div className="mb-8 flex items-center gap-4">
          <div className="shimmer h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <ShimmerBar className="h-9 w-48 rounded-lg" />
            <ShimmerBar className="h-4 w-72 rounded" />
          </div>
        </div>
        <ProductCardSkeletonGrid
          count={8}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
        />
      </div>
    </div>
  );
}
