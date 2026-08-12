/** İletişim sayfası yüklenirken iskelet. */
export default function ContactLoading() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-6 py-10 md:px-12">
      <div className="mb-10 max-w-2xl space-y-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-10 w-56 rounded-lg bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted" />
          ))}
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-11 w-36 rounded-lg bg-muted" />
        </div>
        <div className="h-40 rounded-2xl bg-muted/50" />
      </div>
    </div>
  );
}
