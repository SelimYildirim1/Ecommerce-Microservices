/** Ürün detay yüklenirken iskelet. */
export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-8 h-4 w-64 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-square rounded-2xl bg-muted" />
        <div className="space-y-5">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-10 w-4/5 rounded-lg bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-12 w-40 rounded-lg bg-muted" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-11 flex-1 rounded-lg bg-muted" />
            <div className="h-11 w-36 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
