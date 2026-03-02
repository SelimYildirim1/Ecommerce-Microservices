"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, getCategory, getBrands, createProduct } from "@/lib/api";
import type { CategoryAttribute, CreateProductPayload } from "@/lib/api";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect, useCallback } from "react";

// Zod schema - dinamik olarak genişletilecek
const variantSchema = z.object({
  sku: z.string().min(1, "SKU zorunlu"),
  price: z.number().positive("Fiyat 0'dan büyük olmalı"),
  stockQuantity: z.number().min(0, "Stok negatif olamaz"),
  specifics: z.record(z.string(), z.string()).optional(),
});

const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter").max(150),
  description: z.string().min(1, "Açıklama zorunlu"),
  categoryId: z.string().min(1, "Kategori seçiniz"),
  brandId: z.string().min(1, "Marka seçiniz"),
  primaryImageUrl: z.string().optional(),
  variants: z.array(variantSchema).min(1, "En az bir varyant gerekli"),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Kategori ağacını düzleştir
  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  // Seçilen kategorinin attribute'larını çek
  const { data: categoryDetail } = useQuery({
    queryKey: ["category", selectedCategoryId],
    queryFn: () => getCategory(selectedCategoryId),
    enabled: !!selectedCategoryId,
  });

  const flatCategories = useCallback(() => {
    const result: { id: string; name: string; depth: number }[] = [];
    const flatten = (items: typeof categoryTree, depth = 0) => {
      for (const item of items) {
        result.push({ id: item.id, name: item.name, depth });
        if (item.children?.length) flatten(item.children, depth + 1);
      }
    };
    flatten(categoryTree);
    return result;
  }, [categoryTree]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      brandId: "",
      primaryImageUrl: "",
      variants: [{ sku: "", price: 0, stockQuantity: 0, specifics: {} }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  // Kategori değiştiğinde attribute'ları güncelle
  const watchCategoryId = watch("categoryId");
  useEffect(() => {
    if (watchCategoryId) {
      setSelectedCategoryId(watchCategoryId);
    }
  }, [watchCategoryId]);

  const mutation = useMutation({
    mutationFn: (data: CreateProductPayload) => createProduct(data),
    onSuccess: () => {
      toast.success("Ürün başarıyla oluşturuldu!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    },
    onError: (err: Error) => {
      toast.error(`Hata: ${err.message}`);
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data as CreateProductPayload);
  };

  const attributes = categoryDetail?.attributes || [];
  const variantAttributes = attributes.filter((a) => a.isVariant);
  const nonVariantAttributes = attributes.filter((a) => !a.isVariant);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Yeni Ürün Ekle</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader><CardTitle>Temel Bilgiler</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ürün Adı *</Label>
                <Input id="name" {...register("name")} placeholder="Örn: iPhone 15 Pro" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryImageUrl">Görsel URL</Label>
                <Input id="primaryImageUrl" {...register("primaryImageUrl")} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama *</Label>
              <Textarea id="description" {...register("description")} rows={3} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Kategori Seçimi */}
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <select
                  {...register("categoryId")}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Kategori seçiniz...</option>
                  {flatCategories().map((c) => (
                    <option key={c.id} value={c.id}>
                      {"—".repeat(c.depth)} {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
              </div>

              {/* Marka Seçimi */}
              <div className="space-y-2">
                <Label>Marka *</Label>
                <select
                  {...register("brandId")}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Marka seçiniz...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.brandId && <p className="text-sm text-destructive">{errors.brandId.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dinamik Özellikler - Kategoriye göre */}
        {attributes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Kategori Özellikleri
                <Badge variant="secondary">{categoryDetail?.name}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Bu özellikler seçilen kategoriye göre otomatik yüklendi.
                Varyant özellikleri her varyant için ayrı girilir.
              </p>
            </CardHeader>
            <CardContent>
              {nonVariantAttributes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Genel Özellikler (tüm varyantlar için ortak)</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {nonVariantAttributes.map((attr) => (
                      <DynamicAttributeField
                        key={attr.attributeId}
                        attribute={attr}
                        register={register}
                        fieldPath={`variants.0.specifics.${attr.attributeCode}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {variantAttributes.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-blue-600">
                    Varyant Özellikleri: {variantAttributes.map((a) => a.attributeName).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bu özellikler aşağıdaki her varyant satırında ayrı ayrı girilecek.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Varyantlar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Varyantlar</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ sku: "", price: 0, stockQuantity: 0, specifics: {} })}
              >
                <Plus className="mr-2 h-4 w-4" /> Varyant Ekle
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Varyant #{index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>SKU *</Label>
                    <Input
                      {...register(`variants.${index}.sku`)}
                      placeholder="Örn: IPHONE15-BLK-128"
                    />
                    {errors.variants?.[index]?.sku && (
                      <p className="text-xs text-destructive">{errors.variants[index].sku?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Fiyat (₺) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`variants.${index}.price`, { valueAsNumber: true })}
                    />
                    {errors.variants?.[index]?.price && (
                      <p className="text-xs text-destructive">{errors.variants[index].price?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Stok *</Label>
                    <Input
                      type="number"
                      {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Varyant Dinamik Özellikleri */}
                {variantAttributes.length > 0 && (
                  <>
                    <Separator />
                    <div className="grid gap-3 md:grid-cols-3">
                      {variantAttributes.map((attr) => (
                        <DynamicAttributeField
                          key={`${field.id}-${attr.attributeId}`}
                          attribute={attr}
                          register={register}
                          fieldPath={`variants.${index}.specifics.${attr.attributeCode}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            {errors.variants?.root && (
              <p className="text-sm text-destructive">{errors.variants.root.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/products">
            <Button type="button" variant="outline">İptal</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Kaydediliyor..." : "Ürünü Kaydet"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Dinamik Attribute Field - Kategoriden gelen özellik tipine göre
 * uygun input bileşenini render eder.
 * 
 * DataType: "Text" → Input
 * DataType: "Number" → Input[type=number]
 * DataType: "Select" → <select> (Options'dan)
 * DataType: "Color" → Input[type=color]
 * DataType: "Boolean" → checkbox
 */
function DynamicAttributeField({
  attribute,
  register,
  fieldPath,
}: {
  attribute: CategoryAttribute;
  register: ReturnType<typeof useForm<ProductFormData>>["register"];
  fieldPath: string;
}) {
  const { attributeName, attributeCode, dataType, options, isRequired } = attribute;

  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1">
        {attributeName}
        {isRequired && <span className="text-destructive">*</span>}
        {attribute.isVariant && (
          <Badge variant="outline" className="ml-1 text-xs">Varyant</Badge>
        )}
      </Label>

      {dataType === "Select" && options ? (
        <select
          {...register(fieldPath as any)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Seçiniz...</option>
          {options.split(",").map((opt) => (
            <option key={opt.trim()} value={opt.trim()}>
              {opt.trim()}
            </option>
          ))}
        </select>
      ) : dataType === "Number" ? (
        <Input type="number" {...register(fieldPath as any)} />
      ) : dataType === "Color" ? (
        <Input type="color" {...register(fieldPath as any)} className="h-10 w-20" />
      ) : dataType === "Boolean" ? (
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register(fieldPath as any)} className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">{attributeName}</span>
        </div>
      ) : (
        <Input {...register(fieldPath as any)} placeholder={attributeName} />
      )}
    </div>
  );
}
