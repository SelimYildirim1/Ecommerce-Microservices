"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteProduct, getProduct, updateProduct } from "@/lib/api";
import type { UpdateProductPayload } from "@/lib/api";
import { ProductForm, type ProductFormSubmit } from "@/components/product-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductPayload) => updateProduct(id, data),
    onSuccess: async () => {
      toast.success("Ürün güncellendi.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product", id] }),
      ]);
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      toast.success("Ürün pasife alındı.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const handleSubmit = (values: ProductFormSubmit) => {
    updateMutation.mutate({
      name: values.name,
      description: values.description,
      categoryId: values.categoryId,
      brandId: values.brandId,
      primaryImageUrl: values.primaryImageUrl,
      isActive: values.isActive,
      slug: values.slug || undefined,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      images: values.images,
      variants: values.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stockQuantity: v.stockQuantity,
        specifics: v.specifics,
        isActive: v.isActive,
      })),
    });
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Yükleniyor...</p>;
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">
          Ürün yüklenemedi. {(error as Error)?.message}
        </p>
        <Link href="/products">
          <Button variant="outline">Ürünlere dön</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={product.isActive ? "default" : "destructive"}>
                {product.isActive ? "Aktif" : "Pasif"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {product.variants.length} varyant
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (confirm("Ürün pasife alınacak. Devam edilsin mi?")) {
              deleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Sil
        </Button>
      </div>

      <ProductForm
        product={product}
        submitLabel="Değişiklikleri Kaydet"
        isSubmitting={updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
