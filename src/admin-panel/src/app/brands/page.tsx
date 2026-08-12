"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrand,
  deleteBrand,
  getBrands,
  resolveImageUrl,
  updateBrand,
  uploadImage,
} from "@/lib/api";
import type { Brand, BrandPayload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import Image from "next/image";
import { Store, Plus, Pencil, Trash2, Upload, Loader2, ImageIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

type EditingBrand = BrandPayload & { id?: string };

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const [editing, setEditing] = useState<EditingBrand | null>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["brands"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, ...payload }: EditingBrand) => {
      const body: BrandPayload = {
        name: payload.name,
        logoUrl: payload.logoUrl?.trim() ? payload.logoUrl.trim() : null,
        slug: payload.slug?.trim() || null,
        description: payload.description?.trim() || null,
        metaTitle: payload.metaTitle?.trim() || null,
        metaDescription: payload.metaDescription?.trim() || null,
      };
      return id ? updateBrand(id, body) : createBrand(body);
    },
    onSuccess: () => {
      toast.success("Marka kaydedildi.");
      setEditing(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      toast.success("Marka silindi.");
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setEditing((prev) => (prev ? { ...prev, logoUrl: result.url } : prev));
      toast.success("Logo yüklendi.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const startEdit = (brand: Brand) =>
    setEditing({
      id: brand.id,
      name: brand.name,
      logoUrl: brand.logoUrl ?? "",
      slug: brand.slug ?? "",
      description: brand.description ?? "",
      metaTitle: brand.metaTitle ?? "",
      metaDescription: brand.metaDescription ?? "",
    });

  const columns = useMemo<ColumnDef<Brand>[]>(
    () => [
      {
        accessorKey: "logoUrl",
        header: "Logo",
        enableSorting: false,
        cell: ({ row }) => {
          const brand = row.original;
          return (
            <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted">
              {brand.logoUrl ? (
                <Image
                  src={resolveImageUrl(brand.logoUrl)}
                  alt={brand.name}
                  fill
                  unoptimized
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Marka Adı",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "slug",
        header: "Slug",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.slug || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">İşlemler</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const brand = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Düzenle"
                onClick={() => startEdit(brand)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Sil"
                onClick={() => {
                  if (confirm(`"${brand.name}" silinecek. Emin misiniz?`)) {
                    deleteMutation.mutate(brand.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteMutation]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marka Yönetimi</h1>
        <Button
          onClick={() =>
            setEditing({
              name: "",
              logoUrl: "",
              slug: "",
              description: "",
              metaTitle: "",
              metaDescription: "",
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Yeni Marka
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Markalar ({brands.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={brands}
            isLoading={isLoading}
            emptyMessage="Henüz marka eklenmemiş"
            getRowId={(row) => row.id}
          />
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Markayı Düzenle" : "Yeni Marka"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Marka Adı</Label>
              <Input
                id="brand-name"
                value={editing?.name ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                placeholder="Örn: Apple"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-slug">Slug</Label>
              <Input
                id="brand-slug"
                value={editing?.slug ?? ""}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, slug: e.target.value } : prev))
                }
                placeholder="Boş bırakılırsa addan üretilir"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-desc">Açıklama</Label>
              <Input
                id="brand-desc"
                value={editing?.description ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
                placeholder="Marka açıklaması"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-meta-title">Meta Title</Label>
                <Input
                  id="brand-meta-title"
                  value={editing?.metaTitle ?? ""}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, metaTitle: e.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-meta-desc">Meta Description</Label>
                <Input
                  id="brand-meta-desc"
                  value={editing?.metaDescription ?? ""}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, metaDescription: e.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo</Label>
              <div className="flex items-center gap-3">
                {editing?.logoUrl ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted">
                    <Image
                      src={resolveImageUrl(editing.logoUrl)}
                      alt="Logo"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                ) : null}

                <Input
                  id="brand-logo"
                  value={editing?.logoUrl ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, logoUrl: e.target.value } : prev))
                  }
                  placeholder="https://... veya yükleyin"
                />

                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              İptal
            </Button>
            <Button
              disabled={!editing?.name.trim() || saveMutation.isPending}
              onClick={() => editing && saveMutation.mutate(editing)}
            >
              {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
