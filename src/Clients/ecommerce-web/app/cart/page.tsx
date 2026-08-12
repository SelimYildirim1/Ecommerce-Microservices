import type { Metadata } from "next";
import CartClient from "@/components/CartClient";
import Header from "@/components/Header";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cookies } from "next/headers";
import { serverFetch, serverFetchJson } from "@/lib/server-fetch";

export const metadata: Metadata = {
  title: "Sepetim",
  description: "Alışveriş sepetinizi görüntüleyin ve ödeme adımına geçin.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sepetim | Yıldırım Store",
    description: "Alışveriş sepetinizi görüntüleyin ve ödeme adımına geçin.",
    url: "/cart",
  },
};

function decodeJwtPayload(token: string): { sub?: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Gecersiz token");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
}

/** Üye token yoksa misafir token ile sepet kimliği. */
async function getBasketIdentity() {
  const cookieStore = await cookies();
  const userToken = cookieStore.get("token")?.value;
  const guestToken = cookieStore.get("guestToken")?.value;

  for (const token of [userToken, guestToken]) {
    if (!token) continue;
    try {
      const decoded = decodeJwtPayload(token);
      if (decoded.sub) return { userId: decoded.sub as string, token };
    } catch {
      /* sonraki */
    }
  }
  return { userId: null as string | null, token: null as string | null };
}

async function getBasket(userId: string, token: string) {
  try {
    const res = await serverFetch(`/basket/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getItemMeta(productIds: string[]): Promise<{
  images: Record<string, string>;
  stocks: Record<string, number>;
}> {
  const entries = await Promise.all(
    productIds.map(async (id) => {
      const product = await serverFetchJson<{
        primaryImageUrl?: string;
        pictureUrl?: string;
        stock?: number;
        variants?: { stockQuantity?: number; isActive?: boolean }[];
      } | null>(`/catalog/products/${id}`, null);
      if (!product) return null;

      const url = product.primaryImageUrl ?? product.pictureUrl;
      const direct = Number(product.stock);
      let stock = !Number.isNaN(direct) && direct > 0 ? direct : 0;
      if (stock <= 0 && Array.isArray(product.variants)) {
        stock = product.variants.reduce(
          (sum, v) => sum + (Number(v.stockQuantity) || 0),
          0,
        );
      }

      return {
        id,
        image: typeof url === "string" && url.length > 0 ? url : null,
        stock: stock > 0 ? stock : 20,
      };
    }),
  );

  const images: Record<string, string> = {};
  const stocks: Record<string, number> = {};
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.image) images[entry.id] = entry.image;
    stocks[entry.id] = entry.stock;
  }
  return { images, stocks };
}

export default async function CartPage() {
  const { userId, token } = await getBasketIdentity();

  const basket =
    userId && token
      ? await getBasket(userId, token)
      : { userName: "", items: [] };

  const productIds: string[] = Array.isArray(basket?.items)
    ? Array.from(new Set(basket.items.map((item: { productId: string }) => item.productId)))
    : [];
  const { images, stocks } =
    productIds.length > 0
      ? await getItemMeta(productIds)
      : { images: {}, stocks: {} };

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
        <CartClient initialBasket={basket} images={images} stocks={stocks} />
      </main>
    </div>
  );
}
