"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ChevronRight, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import { API_URL, authHeaders } from "@/lib/api";

interface BasketItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BasketItem[]>([]);
  const [acceptKvkk, setAcceptKvkk] = useState(false);
  const [acceptMesafeli, setAcceptMesafeli] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    fetch(`${API_URL}/basket/${user.id}`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((basket) => {
        if (!cancelled && Array.isArray(basket?.items)) setItems(basket.items);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [formData, setFormData] = useState({
    FirstName: "",
    LastName: "",
    Country: "",
    State: "",
    City: "",
    AddressLine: "",
    ZipCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptKvkk || !acceptMesafeli) {
      alert("Devam etmek için KVKK ve mesafeli satış onaylarını işaretleyin.");
      return;
    }
    setLoading(true);

    if (!user) {
      router.push("/login");
      return;
    }

    const token = Cookies.get("token");

    // Kart PAN/CVV toplanmaz — ödeme mock; alanlar geriye dönük uyumluluk için boş gönderilir.
    const checkoutData = {
      UserName: user.id,
      EmailAddress: user.email,
      TotalPrice: 0,
      FirstName: formData.FirstName,
      LastName: formData.LastName,
      Country: formData.Country,
      State: formData.State,
      City: formData.City,
      AddressLine: formData.AddressLine,
      ZipCode: formData.ZipCode,
      CardName: "",
      CardNumber: "",
      Expiration: "",
      CVV: "",
      PaymentMethod: 1,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_URL}/basket/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(checkoutData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok || res.status === 202 || res.status === 204) {
        window.location.href = "/orders";
      } else {
        let errorMessage = "Lütfen bilgileri kontrol edin:\n";
        try {
          const errorData = await res.json();
          if (errorData.errors) {
            Object.keys(errorData.errors).forEach(key => {
              errorMessage += `- ${errorData.errors[key]}\n`;
            });
          } else {
            errorMessage += errorData.title || errorData.message || "Bilinmeyen hata";
          }
        } catch {
          errorMessage += `HTTP ${res.status}: ${res.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        alert("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        alert("Bağlantı hatası: " + (error.message || "Bilinmeyen hata"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";
  const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <main className="bg-white text-gray-900">
      <Header />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">Anasayfa</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/cart" className="transition-colors hover:text-gray-900">Sepetim</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Ödeme</span>
        </nav>

        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">Ödeme Bilgileri</h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Info */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Kişisel Bilgiler</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ad</label>
                  <input name="FirstName" placeholder="Adınız" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Soyad</label>
                  <input name="LastName" placeholder="Soyadınız" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Teslimat Adresi</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ülke</label>
                  <input name="Country" placeholder="Ülke" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Şehir</label>
                  <input name="City" placeholder="Şehir" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>İlçe / Bölge</label>
                  <input name="State" placeholder="İlçe / Bölge" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Posta Kodu</label>
                  <input name="ZipCode" placeholder="Posta Kodu" required onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Açık Adres</label>
                  <input name="AddressLine" placeholder="Sokak, No, Daire" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Payment (mock — kart verisi toplanmaz) */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Ödeme</h2>
              </div>
              <div className="p-5 space-y-2">
                <p className="text-sm text-gray-700">
                  Ödeme şu an simüle edilir. Kart numarası veya CVV toplanmaz ve sunucuya gönderilmez.
                </p>
                <p className="text-xs text-muted-foreground">
                  Gerçek ödeme sağlayıcısı bağlandığında 3D Secure / hosted form kullanılacaktır.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border p-5 text-sm">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptKvkk}
                  onChange={(e) => setAcceptKvkk(e.target.checked)}
                  className="mt-1"
                  required
                />
                <span>
                  <Link href="/pages/kvkk" className="underline" target="_blank">
                    KVKK aydınlatma metnini
                  </Link>{" "}
                  okudum ve kabul ediyorum.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptMesafeli}
                  onChange={(e) => setAcceptMesafeli(e.target.checked)}
                  className="mt-1"
                  required
                />
                <span>
                  <Link href="/pages/mesafeli-satis-sozlesmesi" className="underline" target="_blank">
                    Mesafeli satış sözleşmesini
                  </Link>{" "}
                  okudum ve kabul ediyorum.
                </span>
              </label>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="border border-border rounded-2xl overflow-hidden sticky top-24">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Özeti</h2>
              </div>
              <div className="p-5 space-y-4">
                {items.length > 0 && (
                  <>
                    <ul className="space-y-3">
                      {items.map((item) => (
                        <li key={`${item.productId}-${item.productName}`} className="flex gap-3 text-sm">
                          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                            {item.quantity}
                          </span>
                          <span className="line-clamp-2 flex-1 text-gray-600">{item.productName}</span>
                          <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 border-t border-border pt-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ara Toplam</span>
                        <span className="font-medium">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kargo</span>
                        <span className="font-medium text-success">Ücretsiz</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <span className="font-semibold">Toplam</span>
                        <span className="text-xl font-bold">{formatPrice(subtotal)}</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs font-medium">Ödeme simülasyonu</p>
                    <p className="text-[10px] text-muted-foreground">Kart verisi işlenmez; sipariş mock ödeme ile ilerler</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || items.length === 0 || !acceptKvkk || !acceptMesafeli}
                  className="w-full py-3 bg-foreground text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sipariş oluşturuluyor...
                    </>
                  ) : (
                    "Ödemeyi simüle et"
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  Bu buton siparişi mock ödeme ile oluşturur. Kart bilgisi istenmez.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

    </main>
  );
}
