"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { useCurrency } from "@/context/CurrencyContext";

export default function LocaleCurrencyControls({
  className = "",
}: {
  className?: string;
}) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const { currencies, selected, setCurrency, loading } = useCurrency();

  const setLocale = (next: AppLocale) => {
    Cookies.set(LOCALE_COOKIE, next, { expires: 365, sameSite: "lax" });
    document.documentElement.lang = next;
    router.refresh();
  };

  return (
    <div className={`flex items-center gap-1 text-[11px] font-medium text-gray-500 ${className}`}>
      <label className="sr-only" htmlFor="lang-select">
        {t("language")}
      </label>
      <select
        id="lang-select"
        value={locale === "en" ? "en" : "tr"}
        onChange={(e) => setLocale(e.target.value === "en" ? "en" : "tr")}
        className="cursor-pointer rounded border-0 bg-transparent px-1 py-0.5 outline-none hover:text-foreground"
        aria-label={t("language")}
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>

      <span className="text-gray-300" aria-hidden>
        |
      </span>

      <label className="sr-only" htmlFor="currency-select">
        {t("currency")}
      </label>
      <select
        id="currency-select"
        value={selected?.code ?? "TRY"}
        disabled={loading || currencies.length === 0}
        onChange={(e) => setCurrency(e.target.value)}
        className="cursor-pointer rounded border-0 bg-transparent px-1 py-0.5 outline-none hover:text-foreground disabled:opacity-60"
        aria-label={t("currency")}
      >
        {(currencies.length > 0
          ? currencies
          : [{ code: "TRY", symbol: "₺", name: "TRY" }]
        ).map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </div>
  );
}
