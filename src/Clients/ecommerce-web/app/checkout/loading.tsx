/** Ödeme yüklenirken iskelet. */
export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-8 h-8 w-48 rounded-lg bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted" />
          ))}
          <div className="h-32 rounded-xl bg-muted" />
        </div>
        <div className="h-64 rounded-2xl border border-gray-100 bg-muted/40" />
      </div>
    </div>
  );
}
