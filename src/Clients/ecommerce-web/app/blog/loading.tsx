/** Blog listesi yüklenirken iskelet. */
export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-2 h-9 w-40 rounded-lg bg-muted" />
      <div className="mb-10 h-4 w-72 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="aspect-[16/10] bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-5 w-4/5 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
