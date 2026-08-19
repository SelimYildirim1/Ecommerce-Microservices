"use client";

import { useProductVariant } from "./ProductVariantContext";
import { attributeLabel, type Product, type Variant } from "@/lib/catalog";

/** Seçilen varyantın teknik özellik tablosu; etiketler kategori özellik adından gelir. */
export default function ProductSpecs({ product }: { product: Product }) {
  const ctx = useProductVariant();
  const selected = ctx?.selectedVariant ?? firstActive(product);
  const rows = collectSpecs(product, selected);

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

function firstActive(product: Product): Variant | null {
  return (product.variants ?? []).find((v) => v.isActive !== false) ?? null;
}

function collectSpecs(
  product: Product,
  variant: Variant | null,
): { key: string; label: string; value: string }[] {
  const sources = variant
    ? [variant]
    : (product.variants ?? []).filter((v) => v.isActive !== false);
  const valuesByKey = new Map<string, Set<string>>();

  for (const item of sources) {
    const specifics = item.specifics;
    if (!specifics || typeof specifics !== "object") continue;

    for (const [key, raw] of Object.entries(specifics)) {
      if (raw == null || raw === "") continue;
      if (!valuesByKey.has(key)) valuesByKey.set(key, new Set());
      valuesByKey.get(key)!.add(String(raw));
    }
  }

  const attributes = product.attributes ?? [];
  const seen = new Set<string>();
  const rows: { key: string; label: string; value: string }[] = [];

  const push = (code: string, label: string) => {
    const matchKey =
      [...valuesByKey.keys()].find((k) => k.toLowerCase() === code.toLowerCase()) ??
      code;
    const values = valuesByKey.get(matchKey);
    if (!values || values.size === 0) return;
    seen.add(matchKey.toLowerCase());
    rows.push({
      key: matchKey,
      label,
      value: Array.from(values).join(", "),
    });
  };

  for (const attr of [...attributes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    push(attr.code, attr.name);
  }

  for (const [key, values] of valuesByKey) {
    if (seen.has(key.toLowerCase())) continue;
    rows.push({
      key,
      label: attributeLabel(key, attributes),
      value: Array.from(values).join(", "),
    });
  }

  return rows;
}
