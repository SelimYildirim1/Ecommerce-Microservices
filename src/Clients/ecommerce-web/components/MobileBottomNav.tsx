"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const ITEMS = [
  { href: "/", label: "Anasayfa", icon: Home, exact: true },
  { href: "/products", label: "Kategoriler", icon: LayoutGrid },
  { href: "/products?focus=search", label: "Arama", icon: Search },
  { href: "/cart", label: "Sepet", icon: ShoppingBag },
  { href: "/account", label: "Hesap", icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user } = useAuth();

  // Checkout / login gibi tam ekran akışlarda gizle
  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobil alt menü"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => {
          const href = item.href === "/account" && !user ? "/login" : item.href;
          const active = item.exact
            ? pathname === "/"
            : pathname === item.href.split("?")[0] ||
              pathname.startsWith(`${item.href.split("?")[0]}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.href === "/cart" && cartCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
