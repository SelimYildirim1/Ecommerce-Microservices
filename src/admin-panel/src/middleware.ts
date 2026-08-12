import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "admin_token";
const PUBLIC_PATHS = ["/login"];
const DEFAULT_AUTH_PATH = "/dashboard";

/**
 * Token'in sadece son kullanma tarihini kontrol eder.
 * Imza dogrulamasi backend'de yapilir; burada amac gereksiz sayfa yuklemesini onlemek.
 */
function isTokenUsable(token: string): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const hasSession = Boolean(token && isTokenUsable(token));

  if (pathname === "/" || pathname === "") {
    return redirectTo(request, hasSession ? DEFAULT_AUTH_PATH : "/login");
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    if (hasSession) {
      return redirectTo(request, DEFAULT_AUTH_PATH);
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return redirectTo(request, "/login", pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};
