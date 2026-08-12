import type { Product } from "@/lib/catalog";

/** Varyant specifics alanlarından teknik özellik tablosu üretir. */
export default function ProductSpecs({ product }: { product: Product }) {
  const rows = collectSpecs(product);

  if (rows.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">
        Teknik Özellikler
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.key}
                className={i % 2 === 0 ? "bg-cream/60" : "bg-white"}
              >
                <th className="w-1/3 px-4 py-3 text-left font-medium text-gray-700">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-gray-600">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function collectSpecs(product: Product): { key: string; label: string; value: string }[] {
  const map = new Map<string, Set<string>>();

  for (const variant of product.variants ?? []) {
    if (variant.isActive === false) continue;
    const specifics = variant.specifics;
    if (!specifics || typeof specifics !== "object") continue;

    for (const [key, raw] of Object.entries(specifics)) {
      if (raw == null || raw === "") continue;
      const value = String(raw);
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(value);
    }
  }

  return Array.from(map.entries()).map(([key, values]) => ({
    key,
    label: humanize(key),
    value: Array.from(values).join(", "),
  }));
}

function humanize(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
