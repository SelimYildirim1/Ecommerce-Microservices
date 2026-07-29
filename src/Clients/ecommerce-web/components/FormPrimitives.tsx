/** Hesap sayfalarinin paylastigi kucuk form parcalari. */

export const INPUT =
  "w-full h-10 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg bg-white p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
