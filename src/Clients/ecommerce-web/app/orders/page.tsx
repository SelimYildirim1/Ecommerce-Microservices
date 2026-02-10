"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

// Sipariş Tipi (Backend'den gelen veri yapısına uygun)
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
  orderStatus: string; // "Submitted", "StockConfirmed" vb.
  totalPrice: number;
  orderItems: OrderItem[];
}

export default function OrdersPage() {
  const { user, isLoading } = useAuth(); // Context'ten kullanıcıyı al
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // Auth yükleniyorsa bekle
    if (isLoading) return;

    // Kullanıcı yoksa Login'e at
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

        // Gateway üzerinden siparişleri çek
        const res = await fetch(`http://localhost:8000/orders/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          console.error("Siparişler çekilemedi");
        }
      } catch (error) {
        console.error("Bağlantı hatası:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrders();
  }, [user, isLoading, router]);

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

  return (
    <main className="container mx-auto py-10 px-4 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-primary">Siparişlerim</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-lg">
          <p className="text-lg text-muted-foreground">
            Henüz hiç siparişiniz yok.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-border rounded-lg bg-card overflow-hidden shadow-sm"
            >
              {/* Sipariş Başlığı */}
              <div className="bg-muted/40 p-4 flex flex-wrap justify-between items-center border-b border-border gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                  <p className="font-medium">
                    {new Date(order.orderDate).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                  <p className="font-bold text-primary">
                    {new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(order.totalPrice)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold 
                    ${order.orderStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                      order.orderStatus === 'StockFailed' || order.orderStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'}`}>
                    {order.orderStatus === 'Submitted' ? 'Sipariş Alındı' :
                      order.orderStatus === 'Paid' ? 'Ödeme Onaylandı' :
                        order.orderStatus === 'StockFailed' ? 'Stok Yetersiz' :
                          order.orderStatus === 'Failed' ? 'İptal Edildi' : order.orderStatus}
                  </span>
                </div>
              </div>

              {/* Sipariş Detayları (Ürünler) */}
              <div className="p-4 space-y-4">
                {order.orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {/* Resim URL varsa göster yoksa placeholder */}
                        {item.pictureUrl ? (
                          <img
                            src={item.pictureUrl}
                            className="object-cover w-full h-full"
                            alt={item.productName}
                          />
                        ) : (
                          "🖼️"
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Adet: {item.units}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium">
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(item.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

