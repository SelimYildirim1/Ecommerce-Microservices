"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/auth";
import { usePermissions, type PermissionKey } from "@/hooks/usePermissions";
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
  Newspaper,
  Mail,
  Megaphone,
  HelpCircle,
  Bell,
  Coins,
  Shield,
  ScrollText,
  Menu,
  FileText,
  Images,
  Smartphone,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: PermissionKey;
};
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Genel",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" }],
  },
  {
    title: "Katalog",
    items: [
      { href: "/products", label: "Ürünler", icon: Package, permission: "catalog" },
      { href: "/categories", label: "Kategoriler", icon: FolderTree, permission: "catalog" },
      { href: "/brands", label: "Markalar", icon: Store, permission: "catalog" },
      { href: "/attributes", label: "Özellikler", icon: Tags, permission: "catalog" },
      { href: "/reviews", label: "Yorumlar", icon: Star, permission: "catalog" },
      { href: "/questions", label: "Soru & Cevap", icon: HelpCircle, permission: "catalog" },
    ],
  },
  {
    title: "Blog",
    items: [
      { href: "/blog", label: "Yazılar", icon: Newspaper, permission: "blog" },
      { href: "/blog/categories", label: "Blog Kategorileri", icon: FolderTree, permission: "blog" },
      { href: "/blog/tags", label: "Blog Etiketleri", icon: Tags, permission: "blog" },
      { href: "/blog/comments", label: "Blog Yorumları", icon: Star, permission: "blog" },
    ],
  },
  {
    title: "İçerik",
    items: [
      { href: "/banners", label: "Bannerlar", icon: Images, permission: "cms" },
      { href: "/mobile-banners", label: "Mobil Bannerlar", icon: Smartphone, permission: "cms" },
      { href: "/menus", label: "Menüler", icon: Menu, permission: "cms" },
      { href: "/contact-messages", label: "İletişim Mesajları", icon: Mail, permission: "content" },
      { href: "/newsletter", label: "Bülten", icon: Megaphone, permission: "content" },
      { href: "/faqs", label: "SSS", icon: HelpCircle, permission: "content" },
      { href: "/stock-alerts", label: "Stok Bildirimleri", icon: Bell, permission: "content" },
      { href: "/email-templates", label: "E-posta Şablonları", icon: FileText, permission: "settings" },
    ],
  },
  {
    title: "Satış",
    items: [
      { href: "/orders", label: "Siparişler", icon: ShoppingCart, permission: "orders" },
      { href: "/returns", label: "İadeler", icon: RotateCcw, permission: "returns" },
      { href: "/promotions", label: "Kupon & Kampanya", icon: BadgePercent, permission: "promotions" },
      { href: "/shipping", label: "Kargo", icon: Truck, permission: "shipping" },
    ],
  },
  {
    title: "Müşteri",
    items: [
      { href: "/customers", label: "Müşteriler", icon: Users, permission: "customers" },
      { href: "/users", label: "Kullanıcı & Roller", icon: Shield, permission: "users" },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { href: "/stock", label: "Stok", icon: Warehouse, permission: "stock" },
      { href: "/warehouses", label: "Depolar", icon: Store, permission: "stock" },
      { href: "/currencies", label: "Para Birimleri", icon: Coins, permission: "currencies" },
      { href: "/reports", label: "Raporlar", icon: BarChart3, permission: "reports" },
      { href: "/content", label: "İçerik", icon: LayoutTemplate, permission: "cms" },
      { href: "/audit-logs", label: "Denetim Kayıtları", icon: ScrollText, permission: "audit" },
      { href: "/settings", label: "Ayarlar", icon: Settings, permission: "settings" },
    ],
  },
];

type SidebarNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, has } = usePermissions();

  const handleLogout = () => {
    clearToken();
    onNavigate?.();
    router.replace("/login");
    router.refresh();
  };

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => has(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <Settings className="h-6 w-6" />
          <span className="text-lg font-semibold">Admin Panel</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
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
            {user.roles.length > 0 && (
              <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                {user.roles.join(", ")}
              </p>
            )}
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
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r bg-card md:flex">
      <SidebarNav />
    </aside>
  );
}
