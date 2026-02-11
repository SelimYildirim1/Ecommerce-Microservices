import CartClient from "@/components/CartClient";
import Header from "@/components/Header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function decodeJwtPayload(token: string): any {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Gecersiz token");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

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

async function getBasket(userId: string) {
  try {
    const res = await fetch(`http://api-gateway:8080/basket/${userId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Sepet cekilemedi:", error);
    return null;
  }
}

export default async function CartPage() {
  const userId = await getUserIdFromCookie();
  if (!userId) redirect("/login");

  const basket = await getBasket(userId);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <a href="/" className="hover:text-foreground transition">Anasayfa</a>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-foreground font-medium">Sepetim</span>
        </nav>

        <h1 className="text-2xl font-bold mb-8">Sepetim</h1>
        <CartClient initialBasket={basket} />
      </div>
    </main>
  );
}
