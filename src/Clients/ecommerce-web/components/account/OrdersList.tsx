"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ImageOff, Package } from "lucide-react";
import Cookies from "js-cookie";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "@/context/AuthContext";
import { API_URL, SIGNALR_URL } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/catalog";
import { notify } from "@/lib/feedback";
import { getOrderStatusInfo, type Order } from "@/lib/order-status";

export default function OrdersList({ limit }: { limit?: number }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = Cookies.get("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch(`${API_URL}/orders/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: Order[] = await res.json();
          const sorted = [...data].sort(
            (a, b) =>
              new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
          );
          setOrders(sorted);
        } else {
          notify.error("Siparişler yüklenemedi.");
        }
      } catch {
        notify.error("Sunucuya bağlanılamadı. Siparişler yüklenemedi.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrders();
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || !user) return;

    const token = Cookies.get("token");
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}/hubs/orderStatus`, {
        withCredentials: true,
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connection.on(
      "OrderStatusUpdated",
      (payload: { orderId: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.orderId ? { ...o, orderStatus: payload.status } : o,
          ),
        );

        if (payload.status === "Paid") {
          notify.success("Ödemeniz onaylandı, sipariş durumu güncellendi.");
        } else {
          notify.info(`Sipariş durumu güncellendi: ${payload.status}`);
        }
      },
    );

    connection.start().catch(() => {
      /* sessiz — canlı durum güncellemesi opsiyonel */
    });

    return () => {
      connection.stop().catch(() => undefined);
    };
  }, [isLoading, user]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">Siparişler yükleniyor...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
          <Package className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="mb-1 text-lg font-medium">Henüz siparişiniz yok</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Alışverişe başlayın ve ilk siparişinizi verin.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Alışverişe başla
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(limit ? orders.slice(0, limit) : orders).map((order) => {
        const statusInfo = getOrderStatusInfo(order.orderStatus);
        return (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="group block overflow-hidden rounded-2xl border border-gray-100 transition-all duration-200 hover:shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Sipariş Tarihi
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {new Date(order.orderDate).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Sipariş No
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-medium">
                    #{order.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                  }).format(order.totalPrice)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                {order.orderItems.slice(0, 4).map((item, index) => (
                  <div
                    key={index}
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                  >
                    {item.pictureUrl ? (
                      <img
                        src={resolveMediaUrl(item.pictureUrl)}
                        className="h-full w-full object-cover"
                        alt={item.productName}
                      />
                    ) : (
                      <ImageOff className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                ))}
                {order.orderItems.length > 4 && (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                    <span className="text-xs font-medium text-muted-foreground">
                      +{order.orderItems.length - 4}
                    </span>
                  </div>
                )}
                <p className="ml-3 text-sm text-muted-foreground">
                  {order.orderItems.length} ürün
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
