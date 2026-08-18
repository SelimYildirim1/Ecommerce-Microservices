import { ProductCardSkeletonGrid } from "@/components/ProductCardSkeleton";

/** Favoriler yüklenirken ürün kartı iskeleti. */
export default function AccountFavoritesLoading() {
  return (
    <div>
      <div className="shimmer mb-6 h-7 w-36 rounded-lg" />
      <ProductCardSkeletonGrid
        count={6}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      />
    </div>
  );
}
