"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Cookies from "js-cookie";

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
      return { label: 'Odeme Onaylandi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check' };
    case 'Submitted':
      return { label: 'Siparis Alindi', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'clock' };
    case 'StockFailed':
      return { label: 'Stok Yetersiz', color: 'bg-red-50 text-red-700 border-red-200', icon: 'x' };
    case 'Failed':
      return { label: 'Iptal Edildi', color: 'bg-red-50 text-red-700 border-red-200', icon: 'x' };
    default:
      return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: 'clock' };
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

        const res = await fetch(`http://localhost:8000/orders/${user.id}`, {
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
        console.error("Baglanti hatasi:", error);
        setNotFound(true);
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrder();
  }, [user, isLoading, router, orderId]);

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
            <span className="text-muted-foreground">Siparis detayi yukleniyor...</span>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !order) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-muted-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Siparis Bulunamadi</h1>
          <p className="text-muted-foreground mb-6">Aradiginiz siparis mevcut degil.</p>
          <Link href="/orders" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white rounded-lg font-medium hover:bg-foreground/85 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Siparislerime Don
          </Link>
        </div>
      </main>
    );
  }

  const statusInfo = getStatusInfo(order.orderStatus);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition">Anasayfa</Link>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <Link href="/orders" className="hover:text-foreground transition">Siparislerim</Link>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-foreground font-medium font-mono">#{order.id.substring(0, 8).toUpperCase()}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Siparis Detayi</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              Siparis No: #{order.id.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Order Items */}
          <div className="lg:col-span-2">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Urunler ({order.orderItems.length})</h2>
              </div>

              <div className="divide-y divide-border">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-5">
                    {/* Product Image */}
                    <Link
                      href={`/products/${item.productId}`}
                      className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0 hover:opacity-80 transition"
                    >
                      {item.pictureUrl ? (
                        <img src={item.pictureUrl} className="w-full h-full object-cover" alt={item.productName} />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-muted-foreground/40">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.productId}`}
                        className="text-sm font-medium text-foreground hover:underline line-clamp-2"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">Adet: {item.units}</p>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(item.price * item.units)}
                      </p>
                      {item.units > 1 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Birim: {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(item.price)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Siparis Ozeti</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Siparis Tarihi</span>
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
                  <span className="text-muted-foreground">Urun Sayisi</span>
                  <span className="font-medium">{order.orderItems.reduce((sum, i) => sum + i.units, 0)} adet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  <span className="font-medium text-success">Ucretsiz</span>
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Toplam</span>
                    <span className="text-xl font-bold">
                      {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(order.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Siparis Durumu</h2>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {/* Step 1: Siparis Alindi */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        ['Submitted', 'Paid'].includes(order.orderStatus)
                          ? 'bg-foreground text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                      <div className="w-px h-6 bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Siparis Alindi</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Odeme */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        order.orderStatus === 'Paid'
                          ? 'bg-foreground text-white'
                          : order.orderStatus === 'Failed' || order.orderStatus === 'StockFailed'
                            ? 'bg-red-500 text-white'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {order.orderStatus === 'Failed' || order.orderStatus === 'StockFailed' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <div className="w-px h-6 bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {order.orderStatus === 'Paid' ? 'Odeme Onaylandi' :
                         order.orderStatus === 'Failed' ? 'Iptal Edildi' :
                         order.orderStatus === 'StockFailed' ? 'Stok Yetersiz' :
                         'Odeme Bekleniyor'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Kargo */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.122-.504 1.1-1.125V14.25m0 0a.75.75 0 0 0-.75-.75H14.25" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kargoya Verildi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <Link
              href="/orders"
              className="flex items-center justify-center gap-2 w-full py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Siparislerime Don
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
