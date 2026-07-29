import CartClient from "@/components/CartClient";
import Header from "@/components/Header";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverFetch, serverFetchJson } from "@/lib/server-fetch";

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
      return { userId: decoded.sub || null, token: token.value };
    } catch (e) {
      return { userId: null, token: null };
    }
  }
  return { userId: null, token: null };
}

async function getBasket(userId: string, token: string) {
  try {
    const res = await serverFetch(`/basket/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Sepet cekilemedi:", error);
    return null;
  }
}

/**
 * Sepet servisi gorsel tutmaz; kartlarda urun fotografi gosterebilmek icin
 * katalogdan urun basina birincil gorsel toplanir.
 */
async function getItemImages(productIds: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    productIds.map(async (id) => {
      const product = await serverFetchJson<{
        primaryImageUrl?: string;
        pictureUrl?: string;
      } | null>(`/catalog/products/${id}`, null);
      if (!product) return null;
      const url = product.primaryImageUrl ?? product.pictureUrl;
      return typeof url === "string" && url.length > 0 ? ([id, url] as const) : null;
    }),
  );

  return Object.fromEntries(entries.filter((entry) => entry !== null));
}

export default async function CartPage() {
  const { userId, token } = await getUserIdFromCookie();
  if (!userId || !token) redirect("/login");

  const basket = await getBasket(userId, token);

  const productIds: string[] = Array.isArray(basket?.items)
    ? Array.from(new Set(basket.items.map((item: { productId: string }) => item.productId)))
    : [];
  const images = productIds.length > 0 ? await getItemImages(productIds) : {};

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <main className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Sepetim</span>
        </nav>

        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">Sepetim</h1>
        <CartClient initialBasket={basket} images={images} />
      </main>

    </div>
  );
}
