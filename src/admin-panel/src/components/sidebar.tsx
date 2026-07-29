"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clearToken, getToken, parseUser, type AdminUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderTree,
  Tags,
  Store,
  Settings,
  LogOut,
  BadgePercent,
  Truck,
  RotateCcw,
  Users,
  Star,
  Warehouse,
  BarChart3,
  LayoutTemplate,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Genel",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/products", label: "Ürünler", icon: Package },
      { href: "/categories", label: "Kategoriler", icon: FolderTree },
      { href: "/brands", label: "Markalar", icon: Store },
      { href: "/attributes", label: "Özellikler", icon: Tags },
      { href: "/reviews", label: "Yorumlar", icon: Star },
    ],
  },
  {
    title: "Satış",
    items: [
      { href: "/orders", label: "Siparişler", icon: ShoppingCart },
      { href: "/returns", label: "İadeler", icon: RotateCcw },
      { href: "/promotions", label: "Kupon & Kampanya", icon: BadgePercent },
      { href: "/shipping", label: "Kargo", icon: Truck },
    ],
  },
  {
    title: "Müşteri",
    items: [{ href: "/customers", label: "Müşteriler", icon: Users }],
  },
  {
    title: "Operasyon",
    items: [
      { href: "/stock", label: "Stok", icon: Warehouse },
      { href: "/reports", label: "Raporlar", icon: BarChart3 },
      { href: "/content", label: "İçerik", icon: LayoutTemplate },
      { href: "/settings", label: "Ayarlar", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) setUser(parseUser(token));
  }, []);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <span className="text-lg font-semibold">Admin Panel</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-4">
        {user && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{user.userName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
