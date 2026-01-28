"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State (Backend Modelinin İsimlerine Birebir Uygun)
  const [formData, setFormData] = useState({
    FirstName: "", 
    LastName: "",  
    Country: "",
    State: "",
    City: "",
    AddressLine: "", // DÜZELTİLDİ (Eskisi: street)
    ZipCode: "",
    CardName: "",
    CardNumber: "",
    Expiration: "",  // DÜZELTİLDİ (Eskisi: cardExpiration)
    CVV: "",       
    CardTypeId: 1 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    // Input isimleri ile State isimleri eşleşmeli
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
        alert("Oturum süreniz dolmuş.");
        router.push("/login");
        return;
    }

    const token = Cookies.get("token");

    // Backend'e gidecek son veri paketi
    const checkoutData = {
      UserName: user.id,
      EmailAddress: user.email, // EKLENDİ (Backend bunu zorunlu istiyor)
      TotalPrice: 0,
      
      // Form verilerini yayıyoruz (İsimler Backend ile aynı olmalı)
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
      // Timeout kontrolü için AbortController kullanıyoruz
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

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

      // 200, 202 (Accepted), 204 (No Content) başarılı kabul edilir
      if (res.ok || res.status === 202 || res.status === 204) { 
        alert("🎉 Siparişiniz Başarıyla Alındı!");
        router.push("/"); 
      } else {
        // Hata mesajını okumaya çalış, yoksa genel hata göster
        let errorMessage = "Lütfen bilgileri kontrol edin:\n";
        try {
          const errorData = await res.json();
          console.error("Validasyon Hataları:", errorData);
          
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
      console.error(error);
      if (error.name === 'AbortError') {
        alert("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        alert("Bağlantı hatası: " + (error.message || "Bilinmeyen hata"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-primary">Ödeme Bilgileri</h1>
        
        <form onSubmit={handleCheckout} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Kişisel Bilgiler */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-6 rounded-lg bg-card">
             <div className="col-span-2"><h2 className="text-xl font-semibold">Kişisel Bilgiler</h2></div>
             {/* Name alanları State'teki isimlerle AYNI olmalı (Büyük harfle başlıyor) */}
             <input name="FirstName" placeholder="Adınız" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
             <input name="LastName" placeholder="Soyadınız" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
          </div>

          {/* Adres Bilgileri */}
          <div className="space-y-4 border p-6 rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">Teslimat Adresi</h2>
            <input name="Country" placeholder="Ülke" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            <input name="City" placeholder="Şehir" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            <input name="State" placeholder="İlçe / Bölge" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            
            {/* DÜZELTİLDİ: AddressLine */}
            <input name="AddressLine" placeholder="Açık Adres (Sokak, No)" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            
            <input name="ZipCode" placeholder="Posta Kodu" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
          </div>

          {/* Ödeme Bilgileri */}
          <div className="space-y-4 border p-6 rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">Kart Bilgileri</h2>
            <input name="CardName" placeholder="Kart Üzerindeki İsim" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            <input name="CardNumber" placeholder="Kart Numarası" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            <div className="grid grid-cols-2 gap-4">
                {/* DÜZELTİLDİ: Expiration */}
                <input name="Expiration" placeholder="SKT (MM/YY)" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
                <input name="CVV" placeholder="CVV" required onChange={handleChange} className="w-full p-3 border rounded bg-background" />
            </div>
          </div>

          <div className="md:col-span-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-bold text-xl rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Sipariş Oluşturuluyor..." : "Ödemeyi Tamamla ve Sipariş Ver"}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}