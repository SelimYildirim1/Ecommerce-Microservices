import AddToCartButton from "@/components/AddToCartButton";
import Header from "@/components/Header";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pictureUrl: string;
  stock: number;
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://api-gateway:8080/catalog/products', {
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero / Banner */}
      <section className="border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 md:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
              Yildirim Store
            </p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Gunun Firsatlari
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              En yeni urunler, en uygun fiyatlarla sizleri bekliyor.
            </p>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{products.length}</span> urun listeleniyor
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-muted-foreground">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground">Henuz urun eklenmemis</p>
            <p className="text-muted-foreground mt-1">Yakinda yeni urunler eklenecek.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-white border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Product Image - Trendyol style tall image */}
                <Link href={`/products/${product.id}`} className="block">
                  <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                    {product.pictureUrl ? (
                      <img
                        src={product.pictureUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-muted-foreground/40">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Info */}
                <div className="p-3">
                  <Link href={`/products/${product.id}`} className="block">
                    <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:underline">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {product.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-foreground">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <AddToCartButton
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">YS</span>
              </div>
              <span className="text-sm font-medium">Yildirim Store</span>
            </div>
            <p className="text-xs text-muted-foreground">
              2025 Yildirim Store. Tum haklar saklidir.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
