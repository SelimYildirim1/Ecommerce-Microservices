import CartClient from "@/components/CartClient";
import Header from "@/components/Header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// JWT Token Decode Fonksiyonu
function decodeJwtPayload(token: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Geçersiz token");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

// Token'dan User ID Çeken Yardımcı Fonksiyon
async function getUserIdFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (token) {
    try {
      const decoded = decodeJwtPayload(token.value);
      return decoded.sub || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Veri Çekme Fonksiyonu (Server Side - Docker içinde api-gateway:8080 kullanır)
async function getBasket(userId: string) {
  try {
    const res = await fetch(`http://api-gateway:8080/basket/${userId}`, {
      cache: "no-store", // Her zaman güncel veri
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Sepet çekilemedi:", error);
    return null;
  }
}

export default async function CartPage() {
  // Cookie'den kullanıcı ID'sini al
  const userId = await getUserIdFromCookie();
  
  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!userId) {
    redirect("/login");
  }

  // Kullanıcının sepetini çek
  const basket = await getBasket(userId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="container mx-auto px-4 pb-20 pt-10">
        <h1 className="text-3xl font-bold mb-8">Sepetim</h1>
        
        {/* Client Component'i Çağır ve Veriyi Gönder */}
        <CartClient initialBasket={basket} />
      </div>
    </main>
  );
}