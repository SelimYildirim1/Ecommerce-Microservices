import AddToCartButton from "@/components/AddToCartButton";
import Header from "@/components/Header";

// 1. Ürün Tipini Tanımlayalım
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pictureUrl: string;
}

// 2. Ürünleri Çeken Fonksiyon
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
      
      {/* Header artık CartContext'ten sepet sayısını alıyor */}
      <Header />

      <div className="container mx-auto py-10">
        <h2 className="text-3xl font-bold mb-6 text-foreground">Günün Fırsatları</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-3 text-center py-10">
              <p className="text-muted-foreground">Henüz ürün eklenmemiş...</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition">
                <div className="h-48 bg-muted rounded-md mb-4 flex items-center justify-center relative overflow-hidden">
                  {product.pictureUrl ? (
                    <img src={product.pictureUrl} alt={product.name} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-muted-foreground">Resim Yok</span>
                  )}
                </div>

                <h3 className="font-semibold text-lg text-foreground truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>

                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-primary">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                  </span>
                  
                  {/* Buton artık içinde 'useAuth' ile kendi kontrolünü yapacak */}
                  <AddToCartButton
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}