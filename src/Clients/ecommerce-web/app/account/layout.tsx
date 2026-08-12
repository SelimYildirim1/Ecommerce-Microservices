"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Heart,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Package,
  RotateCcw,
  Shield,
  Ticket,
  User,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/account", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Siparişlerim", icon: Package },
  { href: "/account/returns", label: "İade Taleplerim", icon: RotateCcw },
  { href: "/account/favorites", label: "Favorilerim", icon: Heart },
  { href: "/account/coupons", label: "Kupon & Puanlarım", icon: Ticket },
  { href: "/account/addresses", label: "Adreslerim", icon: MapPin },
  { href: "/account/profile", label: "Profil Bilgileri", icon: User },
  { href: "/account/password", label: "Şifre Değiştir", icon: KeyRound },
  { href: "/account/notifications", label: "Bildirim İzinleri", icon: Bell },
  { href: "/account/privacy", label: "Gizlilik & KVKK", icon: Shield },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="bg-white text-foreground">
        <Header />
        <div className="flex items-center justify-center py-32">
          <span className="text-muted-foreground">Yükleniyor...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white text-foreground">
      <Header />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">
          Hesabım
        </h1>

        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="w-full shrink-0 space-y-1 lg:w-56">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm transition ${
                    active
                      ? "bg-foreground font-medium text-white"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <section className="min-w-0 flex-1">{children}</section>
        </div>
      </div>
    </main>
  );
}
