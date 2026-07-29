"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Heart, LogOut, Package, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import SearchBox from "./SearchBox";

export default function Header() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { favoriteCount } = useFavorites();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-8 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-white">
            YS
          </span>
          <span className="hidden text-lg font-semibold tracking-tight sm:block">
            Yıldırım Store
          </span>
        </Link>

        <div className="relative mx-4 hidden flex-1 md:flex lg:mx-8 lg:max-w-2xl">
          <Suspense fallback={<div className="h-11 w-full rounded-lg bg-muted" />}>
            <SearchBox />
          </Suspense>
        </div>

        <nav className="flex items-center gap-2 text-sm font-medium text-gray-700 lg:gap-6">
          {user ? (
            <>
              <Link
                href="/orders"
                className="hidden items-center gap-2 transition-colors hover:text-foreground lg:flex"
              >
                <Package className="h-4 w-4" />
                Siparişlerim
              </Link>

              <Link
                href="/profile"
                className="hidden items-center gap-2 transition-colors hover:text-foreground lg:flex"
              >
                <User className="h-4 w-4" />
                {user.name || "Hesabım"}
              </Link>

              <Link
                href="/favorites"
                className="group flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <span className="hidden sm:block">Favorilerim</span>
                <span className="relative">
                  <Heart className="h-5 w-5 group-hover:fill-current" />
                  {favoriteCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {favoriteCount}
                    </span>
                  )}
                </span>
              </Link>

              <button
                onClick={logout}
                title="Çıkış yap"
                aria-label="Çıkış yap"
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-muted hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:block">Giriş Yap</span>
              </Link>
              <Link
                href="/register"
                className="hidden rounded-lg bg-foreground px-4 py-2 text-white transition-colors hover:bg-gray-800 sm:block"
              >
                Kayıt Ol
              </Link>
            </>
          )}

          <Link
            href="/cart"
            className="flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <span className="hidden sm:block">Sepetim</span>
            <ShoppingBag className="h-5 w-5" />
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-bold text-white">
              {cartCount}
            </span>
          </Link>
        </nav>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <Suspense fallback={<div className="h-11 w-full rounded-lg bg-muted" />}>
          <SearchBox />
        </Suspense>
      </div>
    </header>
  );
}
