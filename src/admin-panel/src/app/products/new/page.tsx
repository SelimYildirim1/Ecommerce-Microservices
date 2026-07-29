"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/lib/api";
import type { CreateProductPayload } from "@/lib/api";
import { ProductForm, type ProductFormSubmit } from "@/components/product-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateProductPayload) => createProduct(data),
    onSuccess: () => {
      toast.success("Ürün başarıyla oluşturuldu!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const handleSubmit = (values: ProductFormSubmit) => {
    mutation.mutate({
      name: values.name,
      description: values.description,
      categoryId: values.categoryId,
      brandId: values.brandId,
      primaryImageUrl: values.primaryImageUrl,
      slug: values.slug || undefined,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      images: values.images,
      variants: values.variants.map((v) => ({
        sku: v.sku,
        price: v.price,
        stockQuantity: v.stockQuantity,
        specifics: v.specifics,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni Ürün Ekle</h1>
      </div>

      <ProductForm
        submitLabel="Ürünü Kaydet"
        isSubmitting={mutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
