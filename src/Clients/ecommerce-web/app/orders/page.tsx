"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, ImageOff, Info, Package, X } from "lucide-react";
import Header from "@/components/Header";
import Cookies from "js-cookie";
import * as signalR from "@microsoft/signalr";
import { API_URL, SIGNALR_URL } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/catalog";

interface OrderItem {
  productId: string;
  productName: string;
  pictureUrl: string | null;
  price: number;
  units: number;
}

interface Order {
  id: string;
  orderDate: string;
  orderStatus: string;
  totalPrice: number;
  orderItems: OrderItem[];
}

function getStatusInfo(status: string) {
  switch (status) {
    case "Paid":
      return { label: "Ödeme Onaylandı", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "Submitted":
      return { label: "Sipariş Alındı", color: "bg-blue-50 text-blue-700 border-blue-200" };
    case "Shipped":
      return { label: "Kargoda", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    case "Delivered":
      return { label: "Teslim Edildi", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "Cancelled":
      return { label: "İptal Edildi", color: "bg-red-50 text-red-700 border-red-200" };
    case "Returned":
      return { label: "İade Edildi", color: "bg-amber-50 text-amber-800 border-amber-200" };
    case "StockFailed":
      return { label: "Stok Yetersiz", color: "bg-red-50 text-red-700 border-red-200" };
    case "Failed":
      return { label: "Başarısız", color: "bg-red-50 text-red-700 border-red-200" };
    default:
      return { label: status, color: "bg-gray-50 text-gray-700 border-gray-200" };
  }
}

export default function OrdersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  // Toast otomatik kapanma
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

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
          const data = await res.json();
          setOrders(data);
        }
      } catch (error) {
        console.error("Bağlantı hatası:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrders();
  }, [user, isLoading, router]);

  // SignalR ile gerçek zamanlı sipariş durumu dinleme
  useEffect(() => {
    if (isLoading || !user) return;

    const token = Cookies.get("token");
    if (!token) return;

    const hubUrl = `${SIGNALR_URL}/hubs/orderStatus`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Backend'den gelen OrderStatusUpdated event'ini dinle
    connection.on(
      "OrderStatusUpdated",
      (payload: { orderId: string; status: string; updatedAt?: string }) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === payload.orderId ? { ...o, orderStatus: payload.status } : o
          )
        );

        setToast({
          message:
            payload.status === "Paid"
              ? "Ödemeniz onaylandı, sipariş durumu güncellendi."
              : `Sipariş durumu güncellendi: ${payload.status}`,
          type: payload.status === "Paid" ? "success" : "info",
        });
      }
    );

    connection
      .start()
      .catch((err) =>
        console.error("SignalR baglanti hatasi (OrderStatusHub):", err)
      );

    return () => {
      connection
        .stop()
        .catch((err) =>
          console.error("SignalR baglanti durdurulurken hata:", err)
        );
    };
  }, [isLoading, user]);

  if (loadingData) {
    return (
      <main className="bg-white">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-muted-foreground">Siparişler yükleniyor...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white text-foreground">
      <Header />

      {/* Canlı sipariş durumu toast bildirimi */}
      {toast && (
        <div className="fixed top-20 right-4 z-50">
          <div
            className={`max-w-sm rounded-2xl shadow-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="mt-0.5">
              {toast.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : toast.type === "error" ? (
                <X className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {toast.type === "success"
                  ? "Siparişiniz güncellendi"
                  : "Sipariş durumu güncellendi"}
              </p>
              <p className="text-xs mt-1 opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition">Anasayfa</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Siparişlerim</span>
        </nav>

        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">Siparişlerim</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-medium mb-1">Henüz siparişiniz yok</p>
            <p className="text-muted-foreground text-sm mb-6">Alışverişe başlayın ve ilk siparişinizi verin.</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
              Alışverişe başla
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.orderStatus);
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 group"
                >
                  {/* Order Header */}
                  <div className="bg-muted/30 px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-border">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Sipariş Tarihi</p>
                        <p className="text-sm font-medium mt-0.5">
                          {new Date(order.orderDate).toLocaleDateString("tr-TR", {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Sipariş No</p>
                        <p className="text-sm font-medium mt-0.5 font-mono">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-lg font-bold">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(order.totalPrice)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {order.orderItems.slice(0, 4).map((item, index) => (
                        <div
                          key={index}
                          className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shrink-0"
                        >
                          {item.pictureUrl ? (
                            <img src={resolveMediaUrl(item.pictureUrl)} className="w-full h-full object-cover" alt={item.productName} />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                      ))}
                      {order.orderItems.length > 4 && (
                        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">+{order.orderItems.length - 4}</span>
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm text-muted-foreground">
                          {order.orderItems.length} ürün
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
