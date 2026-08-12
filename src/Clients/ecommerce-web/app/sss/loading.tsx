/** SSS yüklenirken iskelet. */
export default function FaqLoading() {
  return (
    <div className="mx-auto max-w-[900px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-10 space-y-3">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 w-72 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 rounded-xl border border-gray-100 bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
