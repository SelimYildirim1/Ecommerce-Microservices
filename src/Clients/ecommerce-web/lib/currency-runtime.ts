export type CurrencyRuntime = {
  code: string;
  symbol: string;
  rateToBase: number;
  defaultRate: number;
  locale: string;
};

export const CURRENCY_COOKIE = "currency";
export const CURRENCY_META_COOKIE = "currency_meta";

const FALLBACK: CurrencyRuntime = {
  code: "TRY",
  symbol: "₺",
  rateToBase: 1,
  defaultRate: 1,
  locale: "tr-TR",
};

let runtime: CurrencyRuntime = { ...FALLBACK };

export function getCurrencyRuntime(): CurrencyRuntime {
  return runtime;
}

export function setCurrencyRuntime(next: Partial<CurrencyRuntime>) {
  runtime = {
    ...runtime,
    ...next,
    rateToBase: Number(next.rateToBase) > 0 ? Number(next.rateToBase) : runtime.rateToBase,
    defaultRate: Number(next.defaultRate) > 0 ? Number(next.defaultRate) : runtime.defaultRate,
  };
}

export function resetCurrencyRuntime() {
  runtime = { ...FALLBACK };
}

export function parseCurrencyMeta(raw?: string | null): CurrencyRuntime | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CurrencyRuntime>;
    if (!parsed.code) return null;
    return {
      code: String(parsed.code).toUpperCase(),
      symbol: parsed.symbol ? String(parsed.symbol) : String(parsed.code),
      rateToBase: Number(parsed.rateToBase) > 0 ? Number(parsed.rateToBase) : 1,
      defaultRate: Number(parsed.defaultRate) > 0 ? Number(parsed.defaultRate) : 1,
      locale: parsed.locale || (parsed.code === "TRY" ? "tr-TR" : "en-US"),
    };
  } catch {
    return null;
  }
}

/** Base (varsayılan) tutarı seçili para birimine çevirir. */
export function convertFromBase(amount: number, cfg: CurrencyRuntime = runtime): number {
  const value = Number.isFinite(amount) ? amount : 0;
  const rate = cfg.rateToBase > 0 ? cfg.rateToBase : 1;
  const defaultRate = cfg.defaultRate > 0 ? cfg.defaultRate : 1;
  return value * (defaultRate / rate);
}

export function formatConvertedPrice(
  amount: number,
  cfg: CurrencyRuntime = runtime,
): string {
  const converted = convertFromBase(amount, cfg);
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.code,
    }).format(converted);
  } catch {
    return `${cfg.symbol}${converted.toFixed(2)}`;
  }
}

export function localeForCurrency(code: string, uiLocale?: string): string {
  if (code === "TRY") return "tr-TR";
  if (code === "EUR") return "de-DE";
  if (uiLocale === "tr") return "tr-TR";
  return "en-US";
}
