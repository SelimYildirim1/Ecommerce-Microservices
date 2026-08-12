"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import {
  CURRENCY_COOKIE,
  CURRENCY_META_COOKIE,
  formatConvertedPrice,
  getCurrencyRuntime,
  localeForCurrency,
  parseCurrencyMeta,
  setCurrencyRuntime,
  type CurrencyRuntime,
} from "@/lib/currency-runtime";

export type StoreCurrency = {
  id: string;
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
  isDefault: boolean;
  isActive: boolean;
};

type CurrencyContextValue = {
  currencies: StoreCurrency[];
  selected: StoreCurrency | null;
  loading: boolean;
  setCurrency: (code: string) => void;
  formatPrice: (value: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currencies: [],
  selected: null,
  loading: true,
  setCurrency: () => {},
  formatPrice: (value) => formatConvertedPrice(value),
});

function toRuntime(
  currency: StoreCurrency,
  defaultRate: number,
  uiLocale?: string,
): CurrencyRuntime {
  return {
    code: currency.code,
    symbol: currency.symbol,
    rateToBase: Number(currency.rateToBase) || 1,
    defaultRate,
    locale: localeForCurrency(currency.code, uiLocale),
  };
}

function persist(runtime: CurrencyRuntime) {
  Cookies.set(CURRENCY_COOKIE, runtime.code, { expires: 365, sameSite: "lax" });
  Cookies.set(CURRENCY_META_COOKIE, JSON.stringify(runtime), {
    expires: 365,
    sameSite: "lax",
  });
  setCurrencyRuntime(runtime);
}

export function CurrencyProvider({
  children,
  initialMeta,
  uiLocale = "tr",
}: {
  children: ReactNode;
  initialMeta?: CurrencyRuntime | null;
  uiLocale?: string;
}) {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<StoreCurrency[]>([]);
  const [selectedCode, setSelectedCode] = useState(
    () => initialMeta?.code || Cookies.get(CURRENCY_COOKIE) || "TRY",
  );
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (initialMeta) setCurrencyRuntime(initialMeta);
    else {
      const fromCookie = parseCurrencyMeta(Cookies.get(CURRENCY_META_COOKIE));
      if (fromCookie) setCurrencyRuntime(fromCookie);
    }
  }, [initialMeta]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/catalog/currencies`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("currencies");
        const data = (await res.json()) as StoreCurrency[];
        if (cancelled) return;

        const list = Array.isArray(data) ? data.filter((c) => c.isActive !== false) : [];
        setCurrencies(list);

        const cookieCode = Cookies.get(CURRENCY_COOKIE);
        const defaultCurrency =
          list.find((c) => c.isDefault) || list.find((c) => c.code === "TRY") || list[0];
        const preferred =
          list.find((c) => c.code === cookieCode) ||
          list.find((c) => c.code === selectedCode) ||
          defaultCurrency;

        if (preferred && defaultCurrency) {
          const runtime = toRuntime(
            preferred,
            Number(defaultCurrency.rateToBase) || 1,
            uiLocale,
          );
          persist(runtime);
          setSelectedCode(preferred.code);
          setTick((n) => n + 1);
        }
      } catch {
        /* sessiz — varsayılan para birimi kullanılır */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, [uiLocale]);

  const selected = useMemo(
    () => currencies.find((c) => c.code === selectedCode) ?? null,
    [currencies, selectedCode],
  );

  const setCurrency = useCallback(
    (code: string) => {
      const next = currencies.find((c) => c.code === code);
      if (!next) return;
      const defaultCurrency =
        currencies.find((c) => c.isDefault) ||
        currencies.find((c) => c.code === "TRY") ||
        next;
      const runtime = toRuntime(next, Number(defaultCurrency.rateToBase) || 1, uiLocale);
      persist(runtime);
      setSelectedCode(next.code);
      setTick((n) => n + 1);
      router.refresh();
    },
    [currencies, router, uiLocale],
  );

  const formatPrice = useCallback(
    (value: number) => formatConvertedPrice(value, getCurrencyRuntime()),
    [tick],
  );

  const value = useMemo(
    () => ({ currencies, selected, loading, setCurrency, formatPrice }),
    [currencies, selected, loading, setCurrency, formatPrice],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
