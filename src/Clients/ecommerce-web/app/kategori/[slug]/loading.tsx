import Header from "@/components/Header";
import { ProductCardSkeletonGrid, ShimmerBar } from "@/components/ProductCardSkeleton";

/** Kategori sayfası yüklenirken iskelet. */
export default function CategoryLoading() {
  return (
    <div className="bg-white text-foreground">
      <Header />
      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <ShimmerBar className="mb-6 h-4 w-48 rounded" />
        <ShimmerBar className="mb-2 h-10 w-56 rounded-lg" />
        <ShimmerBar className="mb-8 h-4 w-24 rounded" />
        <div className="mb-10 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <ShimmerBar key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <ProductCardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
