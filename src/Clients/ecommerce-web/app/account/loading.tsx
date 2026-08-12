/** Hesap sayfaları yüklenirken iskelet. */
export default function AccountLoading() {
  return (
    <div className="animate-pulse py-6">
      <div className="mb-6 h-8 w-48 rounded-lg bg-muted" />
      <div className="mb-4 h-4 w-64 rounded bg-muted" />
      <div className="space-y-4 rounded-2xl border border-gray-100 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-11 w-full rounded-lg bg-muted" />
          </div>
        ))}
        <div className="h-11 w-36 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
