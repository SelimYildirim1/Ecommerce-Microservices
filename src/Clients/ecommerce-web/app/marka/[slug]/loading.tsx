/** Marka sayfası yüklenirken iskelet. */
export default function BrandLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-2 h-4 w-40 rounded bg-muted" />
      <div className="mb-8 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted" />
        <div className="space-y-2">
          <div className="h-9 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="aspect-[4/3] bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-5 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
