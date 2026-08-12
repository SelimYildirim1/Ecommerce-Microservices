"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories, getCategory, getBrands } from "@/lib/api";
import type {
  CategoryAttribute,
  CategoryTree,
  Product,
  ProductImagePayload,
} from "@/lib/api";
import { useForm, useFieldArray, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImageManager } from "@/components/image-manager";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Renk tipi için varsayılan seçenekler (DB'de Options boşsa). */
const DEFAULT_COLOR_OPTIONS =
  "Siyah,Beyaz,Gri,Kırmızı,Mavi,Yeşil,Sarı,Turuncu,Pembe,Mor,Kahverengi,Bej,Lacivert,Bordo,Çok Renkli";

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU zorunlu"),
  price: z.number().positive("Fiyat 0'dan büyük olmalı"),
  stockQuantity: z.number().min(0, "Stok negatif olamaz"),
  specifics: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean(),
});

const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter").max(150),
  description: z.string().min(1, "Açıklama zorunlu"),
  categoryId: z.string().min(1, "Kategori seçiniz"),
  brandId: z.string().min(1, "Marka seçiniz"),
  isActive: z.boolean(),
  slug: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  variants: z.array(variantSchema).min(1, "En az bir varyant gerekli"),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export interface ProductFormSubmit extends ProductFormValues {
  images: ProductImagePayload[];
  primaryImageUrl?: string;
}

interface Props {
  product?: Product;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: ProductFormSubmit) => void;
}

function flattenCategories(tree: CategoryTree[]) {
  const result: { id: string; name: string; depth: number }[] = [];

  const walk = (items: CategoryTree[], depth: number) => {
    for (const item of items) {
      result.push({ id: item.id, name: item.name, depth });
      if (item.children?.length) walk(item.children, depth + 1);
    }
  };

  walk(tree, 0);
  return result;
}

function toFormValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? "",
    brandId: product?.brandId ?? "",
    isActive: product?.isActive ?? true,
    slug: product?.slug ?? "",
    metaTitle: product?.metaTitle ?? "",
    metaDescription: product?.metaDescription ?? "",
    variants: product?.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          stockQuantity: v.stockQuantity,
          specifics: v.specifics ?? {},
          isActive: v.isActive,
        }))
      : [{ sku: "", price: 0, stockQuantity: 0, specifics: {}, isActive: true }],
  };
}

function toImageState(product?: Product): ProductImagePayload[] {
  if (product?.images?.length) {
    return product.images.map((i) => ({
      url: i.url,
      isPrimary: i.isPrimary,
      sortOrder: i.sortOrder,
    }));
  }

  if (product?.primaryImageUrl) {
    return [{ url: product.primaryImageUrl, isPrimary: true, sortOrder: 0 }];
  }

  return [];
}

/**
 * Kategori/marka listeleri asenkron geldigi icin formu liste hazir olana kadar
 * mount etmiyoruz. Aksi halde <select> bos option listesiyle acilir ve
 * defaultValues icindeki categoryId/brandId tarayici tarafindan kaybolur.
 */
export function ProductForm({ product, submitLabel, isSubmitting, onSubmit }: Props) {
  const { data: categoryTree, isSuccess: categoriesReady } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: brands, isSuccess: brandsReady } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  if (!categoriesReady || !brandsReady || !categoryTree || !brands) {
    return <p className="text-muted-foreground">Form yükleniyor...</p>;
  }

  return (
    <ProductFormReady
      key={product?.id ?? "new"}
      product={product}
      categoryTree={categoryTree}
      brands={brands}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
    />
  );
}

function ProductFormReady({
  product,
  categoryTree,
  brands,
  submitLabel,
  isSubmitting,
  onSubmit,
}: Props & {
  categoryTree: CategoryTree[];
  brands: { id: string; name: string }[];
}) {
  const [images, setImages] = useState<ProductImagePayload[]>(() => toImageState(product));

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(product),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const watchCategoryId = watch("categoryId");
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "");

  // Kayit sonrasi invalidate ile gelen guncel urun verisini forma yansit.
  // Bagimlilik olarak alan imzasi kullanilir; boylece sadece gercek degisimde reset olur.
  const productSyncKey = product
    ? [
        product.id,
        product.categoryId,
        product.brandId,
        product.name,
        product.description,
        product.slug,
        product.metaTitle,
        product.metaDescription,
        product.isActive,
        product.primaryImageUrl,
        product.variants?.map((v) => `${v.id}:${v.sku}:${v.price}:${v.stockQuantity}:${v.isActive}`).join("|"),
        product.images?.map((i) => `${i.url}:${i.isPrimary}`).join("|"),
      ].join("::")
    : "new";

  useEffect(() => {
    if (!product) return;

    reset(toFormValues(product));
    setImages(toImageState(product));
    setSelectedCategoryId(product.categoryId ?? "");
  }, [product, productSyncKey, reset]);

  useEffect(() => {
    if (watchCategoryId) setSelectedCategoryId(watchCategoryId);
  }, [watchCategoryId]);

  const { data: categoryDetail } = useQuery({
    queryKey: ["category", selectedCategoryId],
    queryFn: () => getCategory(selectedCategoryId),
    enabled: !!selectedCategoryId,
  });

  const flatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);

  const attributes = categoryDetail?.attributes ?? [];
  const variantAttributes = attributes.filter((a) => a.isVariant);
  const nonVariantAttributes = attributes.filter((a) => !a.isVariant);

  const submit = (values: ProductFormValues) => {
    const primary = images.find((i) => i.isPrimary) ?? images[0];

    onSubmit({
      ...values,
      images,
      primaryImageUrl: primary?.url,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Temel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ürün Adı *</Label>
            <Input id="name" {...register("name")} placeholder="Örn: iPhone 15 Pro" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama *</Label>
            <Textarea id="description" {...register("description")} rows={3} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Kategori *</Label>
              <select
                {...register("categoryId")}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Kategori seçiniz...</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"—".repeat(c.depth)} {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Marka *</Label>
              <select
                {...register("brandId")}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Marka seçiniz...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.brandId && (
                <p className="text-sm text-destructive">{errors.brandId.message}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isActive")} className="h-4 w-4" />
            Ürün mağazada yayında
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Görseller</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageManager images={images} onChange={setImages} />
        </CardContent>
      </Card>

      {selectedCategoryId && attributes.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kategori Özellikleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Bu kategoriye henüz özellik atanmamış. Varyant seçenekleri (Renk, Beden
              vb.) için önce{" "}
              <Link href="/attributes" className="text-foreground underline">
                Özellikler
              </Link>{" "}
              tanımlayıp{" "}
              <Link href="/categories" className="text-foreground underline">
                Kategoriler
              </Link>{" "}
              sayfasından bu kategoriye atayın.
            </p>
          </CardContent>
        </Card>
      )}

      {attributes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Kategori Özellikleri
              <Badge variant="secondary">{categoryDetail?.name}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Özellikler /admin/attributes üzerinden tanımlanır ve kategoriye
              atanır. Varyant özellikleri her varyant satırında listeden seçilir.
            </p>
          </CardHeader>
          <CardContent>
            {nonVariantAttributes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Genel Özellikler (tüm varyantlar için ortak)
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {nonVariantAttributes.map((attr) => (
                    <DynamicAttributeField
                      key={attr.attributeId}
                      attribute={attr}
                      control={control}
                      fieldPath={`variants.0.specifics.${attr.attributeCode}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {variantAttributes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-blue-600">
                  Varyant Özellikleri:{" "}
                  {variantAttributes.map((a) => a.attributeName).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Aşağıdaki her varyant satırında bu özelliklerden seçim yapılır.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Varyantlar</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ sku: "", price: 0, stockQuantity: 0, specifics: {}, isActive: true })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Varyant Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Varyant #{index + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      {...register(`variants.${index}.isActive`)}
                      className="h-3.5 w-3.5"
                    />
                    Aktif
                  </label>
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
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>SKU *</Label>
                  <Input
                    {...register(`variants.${index}.sku`)}
                    placeholder="Örn: IPHONE15-BLK-128"
                  />
                  {errors.variants?.[index]?.sku && (
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.sku?.message}
                    </p>
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
                    <p className="text-xs text-destructive">
                      {errors.variants[index]?.price?.message}
                    </p>
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

              {variantAttributes.length > 0 && (
                <>
                  <Separator />
                  <div className="grid gap-3 md:grid-cols-3">
                    {variantAttributes.map((attr) => (
                      <DynamicAttributeField
                        key={`${field.id}-${attr.attributeId}`}
                        attribute={attr}
                        control={control}
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

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <p className="text-sm text-muted-foreground">
            Boş bırakılırsa ürün adından otomatik üretilir.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" {...register("slug")} placeholder="iphone-15-pro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Başlık</Label>
              <Input id="metaTitle" {...register("metaTitle")} maxLength={200} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Açıklama</Label>
            <Textarea
              id="metaDescription"
              {...register("metaDescription")}
              rows={2}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/products">
          <Button type="button" variant="outline">
            İptal
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * Kategoriden gelen ozellik tipine gore uygun input.
 * Select/Color → liste seçimi (ürün varyantları isimle tutulur; hex color input kullanılmaz).
 */
function DynamicAttributeField({
  attribute,
  control,
  fieldPath,
}: {
  attribute: CategoryAttribute;
  control: Control<ProductFormValues>;
  fieldPath: string;
}) {
  const { attributeName, dataType, options, isRequired } = attribute;

  const selectOptions = useMemo(() => {
    const raw =
      options?.trim() ||
      (dataType === "Color" || attribute.attributeCode === "color"
        ? DEFAULT_COLOR_OPTIONS
        : "");
    return raw
      ? raw.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
  }, [options, dataType, attribute.attributeCode]);

  const useSelect =
    selectOptions.length > 0 &&
    (dataType === "Select" || dataType === "Color" || attribute.attributeCode === "color");

  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1">
        {attributeName}
        {isRequired && <span className="text-destructive">*</span>}
        {attribute.isVariant && (
          <Badge variant="outline" className="ml-1 text-xs">
            Varyant
          </Badge>
        )}
      </Label>

      <Controller
        control={control}
        name={fieldPath as never}
        render={({ field }) => {
          const value = field.value == null ? "" : String(field.value);

          if (useSelect) {
            const known = selectOptions.includes(value);
            return (
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                ref={field.ref}
              >
                <option value="">Seçiniz...</option>
                {!known && value ? (
                  <option value={value}>{value} (kayıtlı)</option>
                ) : null}
                {selectOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }

          if (dataType === "Number") {
            return (
              <Input
                type="number"
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            );
          }

          if (dataType === "Boolean") {
            return (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={value === "true" || value === "1"}
                  onChange={(e) =>
                    field.onChange(e.target.checked ? "true" : "false")
                  }
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
                <span className="text-sm text-muted-foreground">{attributeName}</span>
              </div>
            );
          }

          return (
            <Input
              value={value}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              ref={field.ref}
              placeholder={attributeName}
            />
          );
        }}
      />
    </div>
  );
}
