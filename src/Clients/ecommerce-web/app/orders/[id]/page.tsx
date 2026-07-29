"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, ImageOff, PackageX, Truck, X } from "lucide-react";
import Header from "@/components/Header";
import Cookies from "js-cookie";
import { API_URL } from "@/lib/api";
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

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

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

export default function OrderDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnReason, setReturnReason] = useState("Other");
  const [returnDetail, setReturnDetail] = useState("");

  const cancellable = order && ["Submitted", "Paid"].includes(order.orderStatus);
  const returnable = order && ["Paid", "Shipped", "Delivered"].includes(order.orderStatus);

  const handleCancel = async () => {
    if (!order || !confirm("Siparişi iptal etmek istediğinize emin misiniz?")) return;
    setActionLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await fetch(`${API_URL}/orders/${order.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Müşteri iptali" }),
      });
      if (res.ok) {
        setOrder({ ...order, orderStatus: "Cancelled" });
      } else {
        alert(await res.text());
      }
    } catch {
      alert("İptal başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await fetch(`${API_URL}/orders/${order.id}/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: returnReason,
          reasonDetail: returnDetail || null,
          items: [],
        }),
      });
      if (res.ok) {
        alert("İade talebiniz oluşturuldu.");
      } else {
        alert(await res.text());
      }
    } catch {
      alert("İade talebi gönderilemedi.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchOrder = async () => {
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
          const found = data.find((o) => o.id === orderId);
          if (found) {
            setOrder(found);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Bağlantı hatası:", error);
        setNotFound(true);
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrder();
  }, [user, isLoading, router, orderId]);

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
            <span className="text-muted-foreground">Sipariş detayı yükleniyor...</span>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !order) {
    return (
      <main className="bg-white text-foreground">
        <Header />
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-50 flex items-center justify-center">
            <PackageX className="w-9 h-9 text-gray-400" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Sipariş bulunamadı</h1>
          <p className="text-muted-foreground mb-6">Aradığınız sipariş mevcut değil.</p>
          <Link href="/orders" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white rounded-lg font-medium hover:bg-gray-800 transition">
            <ArrowLeft className="w-4 h-4" />
            Siparişlerime dön
          </Link>
        </div>

      </main>
    );
  }

  const statusInfo = getStatusInfo(order.orderStatus);
  const isFailed = order.orderStatus === 'Failed' || order.orderStatus === 'StockFailed';

  return (
    <main className="bg-white text-foreground">
      <Header />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition">Anasayfa</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/orders" className="hover:text-foreground transition">Siparişlerim</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium font-mono">#{order.id.substring(0, 8).toUpperCase()}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Sipariş Detayı</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Sipariş No: #{order.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  Ürünler ({order.orderItems.length})
                </h2>
              </div>

              <div className="divide-y divide-border">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-5">
                    <Link
                      href={`/products/${item.productId}`}
                      className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shrink-0 hover:opacity-80 transition"
                    >
                      {item.pictureUrl ? (
                        <img src={resolveMediaUrl(item.pictureUrl)} className="w-full h-full object-cover" alt={item.productName} />
                      ) : (
                        <ImageOff className="w-7 h-7 text-gray-300" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.productId}`}
                        className="text-sm font-medium text-foreground hover:underline line-clamp-2"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">Adet: {item.units}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatPrice(item.price * item.units)}</p>
                      {item.units > 1 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Birim: {formatPrice(item.price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Özeti</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sipariş Tarihi</span>
                  <span className="font-medium">
                    {new Date(order.orderDate).toLocaleDateString("tr-TR", {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saat</span>
                  <span className="font-medium">
                    {new Date(order.orderDate).toLocaleTimeString("tr-TR", {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ürün Sayısı</span>
                  <span className="font-medium">{order.orderItems.reduce((sum, i) => sum + i.units, 0)} adet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  <span className="font-medium text-success">Ücretsiz</span>
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Toplam</span>
                    <span className="text-xl font-bold">{formatPrice(order.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Durumu</h2>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        ['Submitted', 'Paid'].includes(order.orderStatus)
                          ? 'bg-foreground text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      </div>
                      <div className="w-px h-6 bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sipariş Alındı</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        order.orderStatus === 'Paid'
                          ? 'bg-foreground text-white'
                          : isFailed
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {isFailed ? (
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        ) : (
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="w-px h-6 bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {order.orderStatus === 'Paid' ? 'Ödeme Onaylandı' :
                         order.orderStatus === 'Failed' ? 'İptal Edildi' :
                         order.orderStatus === 'StockFailed' ? 'Stok Yetersiz' :
                         'Ödeme Bekleniyor'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Truck className="w-3 h-3" strokeWidth={2} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kargoya Verildi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/orders"
              className="flex items-center justify-center gap-2 w-full py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Siparişlerime dön
            </Link>

            {cancellable && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancel}
                className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Siparişi iptal et
              </button>
            )}

            {returnable && (
              <div className="border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">İade talebi</h3>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-10 rounded-lg border px-3 text-sm"
                >
                  <option value="Damaged">Hasarlı ürün</option>
                  <option value="WrongItem">Yanlış ürün</option>
                  <option value="NotAsDescribed">Açıklamayla uyuşmuyor</option>
                  <option value="ChangedMind">Fikir değişikliği</option>
                  <option value="Defective">Arızalı</option>
                  <option value="SizeIssue">Beden uymadı</option>
                  <option value="LateDelivery">Geç teslimat</option>
                  <option value="Other">Diğer</option>
                </select>
                <textarea
                  value={returnDetail}
                  onChange={(e) => setReturnDetail(e.target.value)}
                  placeholder="Açıklama (opsiyonel)"
                  className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                />
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReturn}
                  className="w-full py-3 rounded-xl border border-foreground text-sm font-medium disabled:opacity-50"
                >
                  İade talebi oluştur
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </main>
  );
}
