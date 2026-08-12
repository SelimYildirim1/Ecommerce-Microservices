/** Sepet yüklenirken iskelet. */
export default function CartLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-8 h-8 w-40 rounded-lg bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="h-24 w-24 shrink-0 rounded-xl bg-muted" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-48 rounded-2xl border border-gray-100 bg-muted/40" />
      </div>
    </div>
  );
}
