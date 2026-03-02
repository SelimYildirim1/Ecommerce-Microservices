import Header from "@/components/Header";
import AddToCartButton from "@/components/AddToCartButton";
import Link from "next/link";
import { INTERNAL_API_URL } from "@/lib/api";

interface Variant {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  specifics: Record<string, unknown> | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  primaryImageUrl: string | null;
  isActive: boolean;
  price: number;
  stock: number;
  variants: Variant[];
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/catalog/products/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch (error) {
    return null;
  }
}

function getPrice(product: Product): number {
  const directPrice = Number(product.price);
  if (!isNaN(directPrice) && directPrice > 0) return directPrice;
  if (product.variants?.length > 0) {
    const variantPrice = Number(product.variants[0].price);
    if (!isNaN(variantPrice)) return variantPrice;
  }
  return 0;
}

function getTotalStock(product: Product): number {
  const directStock = Number(product.stock);
  if (!isNaN(directStock) && directStock > 0) return directStock;
  if (product.variants?.length > 0) {
    return product.variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
  }
  return 0;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-muted-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Urun Bulunamadi</h1>
          <p className="text-muted-foreground mb-6">Aradiginiz urun mevcut degil veya kaldirilmis olabilir.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white rounded-lg font-medium hover:bg-foreground/85 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Anasayfaya Don
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition">Anasayfa</Link>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

          {/* Left: Product Image */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden border border-border">
              {(product.primaryImageUrl || (product as unknown as Record<string, unknown>)['pictureUrl']) ? (
                <img
                  src={(product.primaryImageUrl || (product as unknown as Record<string, unknown>)['pictureUrl']) as string}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-muted-foreground/30">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="text-sm text-muted-foreground">Gorsel mevcut degil</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col">
            {/* Title */}
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Product ID */}
            <p className="text-xs text-muted-foreground mt-2">
              Urun Kodu: {product.id.substring(0, 8).toUpperCase()}
            </p>

            {/* Price */}
            <div className="mt-6 pb-6 border-b border-border">
              <span className="text-3xl lg:text-4xl font-bold text-foreground">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(getPrice(product))}
              </span>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Urun Aciklamasi</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description || "Bu urun icin henuz bir aciklama eklenmemis."}
              </p>
            </div>

            {/* Stock Info */}
            <div className="mt-6 flex items-center gap-2">
              {(() => {
                const totalStock = getTotalStock(product);
                return totalStock > 0 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">
                      Stokta {totalStock > 10 ? 'mevcut' : `son ${totalStock} adet`}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-sm text-danger">Stokta yok</span>
                  </>
                );
              })()}
            </div>

            {/* Add to Cart */}
            <div className="mt-8 max-w-sm">
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price: getPrice(product)
                }}
              />
            </div>

            {/* Features */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.122-.504 1.1-1.125V14.25m0 0a.75.75 0 0 0-.75-.75H14.25m0 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v7.875" />
                </svg>
                <div>
                  <p className="text-xs font-medium">Ucretsiz Kargo</p>
                  <p className="text-[10px] text-muted-foreground">150 TL ve uzeri</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                <div>
                  <p className="text-xs font-medium">Kolay Iade</p>
                  <p className="text-[10px] text-muted-foreground">15 gun icinde</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <div>
                  <p className="text-xs font-medium">Guvenli Odeme</p>
                  <p className="text-[10px] text-muted-foreground">256-bit SSL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
