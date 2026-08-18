/** ProductCard ile aynı ölçü ve boşluklara sahip shimmer iskelet. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="shimmer aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="shimmer h-3 w-16 rounded" />
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="shimmer h-5 w-20 rounded" />
          <div className="shimmer h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ShimmerBar({ className }: { className?: string }) {
  return <div className={`shimmer ${className ?? ""}`} />;
}

export function ProductCardSkeletonGrid({
  count = 8,
  className = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label="Ürünler yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
      <span className="sr-only">Ürünler yükleniyor</span>
    </div>
  );
}
