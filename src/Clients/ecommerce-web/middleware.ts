import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, LOCALE_COOKIE, resolveLocale } from "./i18n/config";

/**
 * Slug duzeltmesi oncesindeki kategori/marka adresleri icin kalici yonlendirme.
 *
 * Yonlendirme sayfa icinde de deneniyor ama Next akisa basladiktan sonra HTTP
 * durumunu 200'e sabitliyor; arama motoruna 301 gitmesi icin karar render
 * baslamadan burada verilmeli. Esleme listesi kucuk oldugu icin bellekte
 * tutulur, boylece her istekte servise gidilmez.
 */
const REDIRECT_TTL_MS = 5 * 60 * 1000;
const REDIRECT_TIMEOUT_MS = 2000;

type SlugRedirect = { from: string; to: string };
type SlugRedirectMap = { categories: SlugRedirect[]; brands: SlugRedirect[] };

type CacheEntry = { categories: Map<string, string>; brands: Map<string, string> };

let cache: CacheEntry | null = null;
let cacheExpiresAt = 0;
let inFlight: Promise<CacheEntry | null> | null = null;

const toMap = (list: SlugRedirect[]) =>
  new Map(list.filter((r) => r.from && r.to).map((r) => [r.from, r.to]));

async function loadRedirects(): Promise<CacheEntry | null> {
  const base = process.env.INTERNAL_API_URL;
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/catalog/slug-redirects`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as SlugRedirectMap;
    return {
      categories: toMap(data.categories ?? []),
      brands: toMap(data.brands ?? []),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Suresi gecmisse listeyi yeniler. Servis cevap vermezse eldeki liste
 * kullanilmaya devam eder; yonlendirme calismasa bile sayfa acilir.
 */
async function getRedirects(): Promise<CacheEntry | null> {
  if (cache && Date.now() < cacheExpiresAt) return cache;

  inFlight ??= loadRedirects().finally(() => {
    inFlight = null;
  });

  const loaded = await inFlight;

  if (loaded) {
    cache = loaded;
    cacheExpiresAt = Date.now() + REDIRECT_TTL_MS;
  }

  return cache;
}

/** Yalnizca /kategori/<slug> ve /marka/<slug> tek segmentli adresler. */
function parseSlugPath(pathname: string) {
  const match = /^\/(kategori|marka)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;

  try {
    return { kind: match[1], slug: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  const cookie = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };

  if (!current) {
    response.cookies.set(LOCALE_COOKIE, defaultLocale, cookie);
    return response;
  }

  const normalized = resolveLocale(current);
  if (normalized !== current) {
    response.cookies.set(LOCALE_COOKIE, normalized, cookie);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const target = parseSlugPath(request.nextUrl.pathname);

  if (target) {
    const redirects = await getRedirects();
    const table = target.kind === "kategori" ? redirects?.categories : redirects?.brands;
    const next = table?.get(target.slug);

    if (next && next !== target.slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/${target.kind}/${next}`;
      return applyLocaleCookie(request, NextResponse.redirect(url, 301));
    }
  }

  return applyLocaleCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
