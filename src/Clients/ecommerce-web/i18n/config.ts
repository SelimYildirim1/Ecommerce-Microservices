export const locales = ["tr", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "tr";
export const LOCALE_COOKIE = "locale";

export function resolveLocale(value?: string | null): AppLocale {
  return value === "en" ? "en" : "tr";
}
