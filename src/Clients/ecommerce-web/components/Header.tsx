"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCartDrawer } from "@/context/CartDrawerContext";
import { useFavorites } from "@/context/FavoritesContext";
import SearchBox from "./SearchBox";
import CategoryMegaMenu from "./CategoryMegaMenu";
import CartDrawer from "./CartDrawer";
import CompareNavLink from "./CompareNavLink";
import NotificationCenter from "./NotificationCenter";
import LocaleCurrencyControls from "./LocaleCurrencyControls";

/** İkon butonu — tooltip için title, erişilebilirlik için aria-label. */
function IconAction({
  label,
  onClick,
  href,
  children,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const classes = `relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-muted hover:text-foreground ${className}`;

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={classes}
    >
      {children}
    </button>
  );
}

function Badge({ count, danger = false }: { count: number; danger?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
        danger ? "bg-red-500" : "bg-foreground"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Header() {
  const t = useTranslations("Header");
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { openDrawer } = useCartDrawer();
  const { favoriteCount, revision } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!mobileAccountOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileAccountOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileAccountOpen]);

  const accountLinks = [
    { href: "/account", label: t("overview") },
    { href: "/account/orders", label: t("orders"), icon: Package },
    { href: "/account/favorites", label: t("favorites") },
    { href: "/account/addresses", label: t("addresses") },
    { href: "/account/profile", label: t("profile") },
    { href: "/account/password", label: t("password") },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-white">
        {/* Üst bant: dil / para birimi */}
        <div className="hidden border-b border-gray-100 bg-gray-50/80 sm:block">
          <div className="mx-auto flex max-w-[1600px] items-center justify-end px-4 py-1.5 md:px-8 lg:px-12">
            <LocaleCurrencyControls />
          </div>
        </div>

        {/* Ana bar: logo | arama | aksiyonlar */}
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:gap-6 md:px-8 md:py-3.5 lg:px-12">
          <Link href="/" className="flex w-[20%] min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-white">
              YS
            </span>
            <span className="hidden truncate text-lg font-semibold tracking-tight md:block">
              Yıldırım Store
            </span>
          </Link>

          <div className="relative hidden min-w-0 flex-1 md:block md:max-w-none lg:mx-2">
            <Suspense fallback={<div className="h-11 w-full rounded-lg bg-muted" />}>
              <SearchBox />
            </Suspense>
          </div>

          {/* Sağ aksiyonlar: karşılaştır → bildirim → favori → hesap → sepet */}
          <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-1.5">
            <CompareNavLink showLabel={false} className="!gap-0" />

            <NotificationCenter />

            <IconAction
              label={t("favorites")}
              href={user ? `/account/favorites?r=${revision}` : "/login"}
            >
              <Heart className="h-5 w-5" />
              <Badge count={favoriteCount} danger />
            </IconAction>

            {user ? (
              <>
                <div className="relative hidden lg:block" ref={menuRef}>
                  <button
                    type="button"
                    title={user.name || t("account")}
                    aria-label={user.name || t("account")}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-10 items-center gap-1 rounded-lg px-2 text-gray-700 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <User className="h-5 w-5" />
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                    >
                      <div className="border-b border-gray-50 px-4 py-2.5">
                        <p className="truncate text-sm font-medium">
                          {user.name || t("account")}
                        </p>
                        {user.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                      {accountLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
                        >
                          {link.icon && <link.icon className="h-3.5 w-3.5" />}
                          {link.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {t("logout")}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMobileAccountOpen(true)}
                  aria-label={t("accountMenu")}
                  title={t("accountMenu")}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-muted lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </>
            ) : (
              <IconAction label={t("login")} href="/login">
                <User className="h-5 w-5" />
              </IconAction>
            )}

            {/* Sepet — her zaman en sağda */}
            <button
              type="button"
              onClick={openDrawer}
              title={t("cart")}
              aria-label={`${t("cart")}${cartCount > 0 ? `, ${cartCount}` : ""}`}
              className="relative ml-0.5 flex h-10 items-center gap-2 rounded-lg px-2.5 text-gray-700 transition-colors hover:bg-muted hover:text-foreground sm:ml-1"
            >
              <span className="relative">
                <ShoppingBag className="h-5 w-5" />
                <Badge count={cartCount} />
              </span>
            </button>
          </nav>
        </div>

        <div className="flex items-center justify-end px-4 pb-2 sm:hidden">
          <LocaleCurrencyControls />
        </div>

        <div className="px-4 pb-3 md:hidden">
          <Suspense fallback={<div className="h-11 w-full rounded-lg bg-muted" />}>
            <SearchBox />
          </Suspense>
        </div>

        <CategoryMegaMenu />
      </header>

      <CartDrawer />

      {user && (
        <>
          <div
            className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 lg:hidden ${
              mobileAccountOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setMobileAccountOpen(false)}
            aria-hidden={!mobileAccountOpen}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("accountMenu")}
            className={`fixed inset-y-0 left-0 z-[70] flex w-full max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
              mobileAccountOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user.name || t("account")}
                </p>
                {user.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileAccountOpen(false)}
                aria-label={t("closeMenu")}
                className="rounded-lg p-2 text-gray-500 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileAccountOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted"
                >
                  {link.icon ? (
                    <link.icon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                setMobileAccountOpen(false);
                logout();
              }}
              className="flex items-center gap-3 border-t border-border px-5 py-4 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </aside>
        </>
      )}
    </>
  );
}
