"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { Bell, Heart, MapPin, Package, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import OrdersList from "@/components/account/OrdersList";
import FavoritesList from "@/components/account/FavoritesList";
import { API_URL } from "@/lib/api";
import * as api from "@/lib/client-api";
import { getOrderStatusInfo, type Order } from "@/lib/order-status";

export default function AccountOverviewPage() {
  const { user } = useAuth();
  const { favoriteCount, revision } = useFavorites();
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const token = Cookies.get("token");
        if (token) {
          const res = await fetch(`${API_URL}/orders/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const orders: Order[] = await res.json();
            if (orders.length) {
              const sorted = [...orders].sort(
                (a, b) =>
                  new Date(b.orderDate).getTime() -
                  new Date(a.orderDate).getTime(),
              );
              setLatestOrder(sorted[0]);
            }
          }
        }
      } catch {
        /* ignore */
      }

      try {
        const addresses = await api.getAddresses();
        const preferred =
          addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        if (preferred) {
          setDefaultAddress(
            `${preferred.addressTitle} — ${preferred.city}${preferred.district ? `, ${preferred.district}` : ""}`,
          );
        }
      } catch {
        /* ignore */
      }
    };

    load();
  }, [user]);

  const quickLinks = [
    {
      href: "/account/addresses",
      icon: MapPin,
      title: "Adreslerim",
      desc: defaultAddress ?? "Kayıtlı adres ekleyin",
    },
    {
      href: "/account/profile",
      icon: User,
      title: "Profil Bilgileri",
      desc: user?.email ?? "Profilinizi güncelleyin",
    },
    {
      href: "/account/notifications",
      icon: Bell,
      title: "Bildirim İzinleri",
      desc: "Stok, indirim ve sipariş bildirimleri",
    },
  ];

  return (
    <div className="space-y-10">
      <p className="text-muted-foreground">
        Merhaba{user?.name ? `, ${user.name}` : ""} — hesabınızı buradan
        yönetebilirsiniz.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickLinks.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-gray-100 p-5 transition hover:border-foreground/20 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">{card.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {card.desc}
              </p>
            </Link>
          );
        })}
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Package className="h-5 w-5" />
              Siparişlerim
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {latestOrder
                ? `Son: #${latestOrder.id.slice(0, 8).toUpperCase()} — ${getOrderStatusInfo(latestOrder.orderStatus).label}`
                : "Siparişleriniz bu listede görünür"}
            </p>
          </div>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-foreground hover:underline"
          >
            Tümü
          </Link>
        </div>
        <OrdersList limit={3} />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Heart className="h-5 w-5" />
              Favorilerim
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {favoriteCount > 0
                ? `${favoriteCount} ürün favorilerinizde`
                : "Beğendiğiniz ürünler burada listelenir"}
            </p>
          </div>
          <Link
            href="/account/favorites"
            className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-foreground hover:underline"
          >
            Tümü
          </Link>
        </div>
        <FavoritesList key={revision} limit={4} />
      </section>
    </div>
  );
}
