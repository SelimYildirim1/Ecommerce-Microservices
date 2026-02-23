"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Cookies from "js-cookie";
import * as signalR from "@microsoft/signalr";
import { API_URL, SIGNALR_URL } from "@/lib/api";

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
    case 'Paid':
      return { label: 'Odeme Onaylandi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Submitted':
      return { label: 'Siparis Alindi', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'StockFailed':
      return { label: 'Stok Yetersiz', color: 'bg-red-50 text-red-700 border-red-200' };
    case 'Failed':
      return { label: 'Iptal Edildi', color: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
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
        console.error("Baglanti hatasi:", error);
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

    const hubUrl = `${SIGNALR_URL}/hubs/orderStatus?userId=${encodeURIComponent(
      user.id
    )}`;

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
              ? "✅ Ödemen onaylandi, siparis durumu guncellendi."
              : `📦 Siparis durumu guncellendi: ${payload.status}`,
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
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3">
            <svg className="animate-spin w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-muted-foreground">Siparisler yukleniyor...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Canlı sipariş durumu toast bildirimi */}
      {toast && (
        <div className="fixed top-20 right-4 z-50">
          <div
            className={`max-w-sm rounded-xl shadow-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="mt-0.5">
              {toast.type === "success" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              ) : toast.type === "error" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {toast.type === "success"
                  ? "Siparisin guncellendi"
                  : "Siparis durumu guncellendi"}
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

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition">Anasayfa</Link>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-foreground font-medium">Siparislerim</span>
        </nav>

        <h1 className="text-2xl font-bold mb-8">Siparislerim</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 border border-border rounded-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-1">Henuz siparisiz yok</p>
            <p className="text-muted-foreground text-sm mb-6">Alisverise baslayin ve ilk siparisizi verin.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition">
              Alisverise Basla
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
                  className="block border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group"
                >
                  {/* Order Header */}
                  <div className="bg-muted/30 px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-border">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Siparis Tarihi</p>
                        <p className="text-sm font-medium mt-0.5">
                          {new Date(order.orderDate).toLocaleDateString("tr-TR", {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Siparis No</p>
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
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {order.orderItems.slice(0, 4).map((item, index) => (
                        <div
                          key={index}
                          className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0"
                        >
                          {item.pictureUrl ? (
                            <img src={item.pictureUrl} className="w-full h-full object-cover" alt={item.productName} />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6 text-muted-foreground/40">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                            </svg>
                          )}
                        </div>
                      ))}
                      {order.orderItems.length > 4 && (
                        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center border border-border shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">+{order.orderItems.length - 4}</span>
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm text-muted-foreground">
                          {order.orderItems.length} urun
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
