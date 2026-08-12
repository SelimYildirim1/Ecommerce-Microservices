"use client";

import { formatPrice } from "@/lib/catalog";

const DEFAULT_RATES: Record<number, number> = {
  3: 0,
  6: 0.02,
  9: 0.04,
  12: 0.06,
};

/**
 * Taksit tablosu. Site ayarlarından `commerce.installmentRates` JSON beklenir:
 * {"3":0,"6":0.02,"9":0.04,"12":0.06}
 */
export default function InstallmentTable({
  price,
  ratesJson,
}: {
  price: number;
  ratesJson?: string | null;
}) {
  if (!price || price <= 0) return null;

  let rates = DEFAULT_RATES;
  if (ratesJson) {
    try {
      const parsed = JSON.parse(ratesJson) as Record<string, number>;
      rates = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [Number(k), Number(v)]),
      ) as Record<number, number>;
    } catch {
      /* varsayılan */
    }
  }

  const months = Object.keys(rates)
    .map(Number)
    .filter((m) => m > 0)
    .sort((a, b) => a - b);

  if (months.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">
        Taksit Seçenekleri
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-cream/80 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Taksit</th>
              <th className="px-4 py-2.5 font-medium">Aylık</th>
              <th className="px-4 py-2.5 font-medium">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => {
              const rate = rates[m] ?? 0;
              const total = price * (1 + rate);
              const monthly = total / m;
              return (
                <tr key={m} className={i % 2 === 0 ? "bg-white" : "bg-cream/40"}>
                  <td className="px-4 py-2.5 font-medium">{m} ay</td>
                  <td className="px-4 py-2.5 text-gray-600">{formatPrice(monthly)}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {formatPrice(total)}
                    {rate === 0 && (
                      <span className="ml-2 text-xs text-emerald-600">vade farksız</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
