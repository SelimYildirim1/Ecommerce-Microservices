"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Cookies from "js-cookie";

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    FirstName: "",
    LastName: "",
    Country: "",
    State: "",
    City: "",
    AddressLine: "",
    ZipCode: "",
    CardName: "",
    CardNumber: "",
    Expiration: "",
    CVV: "",
    CardTypeId: 1
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      router.push("/login");
      return;
    }

    const token = Cookies.get("token");

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
      CardName: formData.CardName,
      CardNumber: formData.CardNumber,
      Expiration: formData.Expiration,
      CVV: formData.CVV,
      CardTypeId: 1
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch("http://localhost:8000/basket/checkout", {
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
        let errorMessage = "Lutfen bilgileri kontrol edin:\n";
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
        alert("Istek zaman asimina ugradi. Lutfen tekrar deneyin.");
      } else {
        alert("Baglanti hatasi: " + (error.message || "Bilinmeyen hata"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";
  const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

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
          <Link href="/cart" className="hover:text-foreground transition">Sepetim</Link>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-foreground font-medium">Odeme</span>
        </nav>

        <h1 className="text-2xl font-bold mb-8">Odeme Bilgileri</h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Info */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Kisisel Bilgiler</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ad</label>
                  <input name="FirstName" placeholder="Adiniz" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Soyad</label>
                  <input name="LastName" placeholder="Soyadiniz" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Teslimat Adresi</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ulke</label>
                  <input name="Country" placeholder="Ulke" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sehir</label>
                  <input name="City" placeholder="Sehir" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ilce / Bolge</label>
                  <input name="State" placeholder="Ilce / Bolge" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Posta Kodu</label>
                  <input name="ZipCode" placeholder="Posta Kodu" required onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Acik Adres</label>
                  <input name="AddressLine" placeholder="Sokak, No, Daire" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Kart Bilgileri</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Kart Uzerindeki Isim</label>
                  <input name="CardName" placeholder="Kart Uzerindeki Isim" required onChange={handleChange} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Kart Numarasi</label>
                  <input name="CardNumber" placeholder="0000 0000 0000 0000" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Son Kullanma</label>
                  <input name="Expiration" placeholder="MM/YY" required onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CVV</label>
                  <input name="CVV" placeholder="000" required onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="border border-border rounded-xl overflow-hidden sticky top-24">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Siparis Ozeti</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium">Guvenli Odeme</p>
                    <p className="text-[10px] text-muted-foreground">256-bit SSL ile korunmaktadir</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-foreground text-white rounded-lg font-medium hover:bg-foreground/85 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Siparis Olusturuluyor...
                    </>
                  ) : (
                    "Odemeyi Tamamla"
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  Odemeyi Tamamla butonuna basarak, kullanim kosullarini ve gizlilik politikasini kabul etmis olursunuz.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
