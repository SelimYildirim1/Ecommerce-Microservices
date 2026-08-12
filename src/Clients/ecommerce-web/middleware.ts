import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, LOCALE_COOKIE, resolveLocale } from "./i18n/config";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!current) {
    response.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    const normalized = resolveLocale(current);
    if (normalized !== current) {
      response.cookies.set(LOCALE_COOKIE, normalized, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
