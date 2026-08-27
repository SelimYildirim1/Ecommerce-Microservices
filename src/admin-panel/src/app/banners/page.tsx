"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BANNER_PLACEMENT_DESKTOP,
  createBanner,
  deleteBanner,
  getBanners,
  resolveImageUrl,
  updateBanner,
  uploadImage,
  type Banner,
  type BannerPayload,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import Image from "next/image";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const HOME_PLACEMENT = BANNER_PLACEMENT_DESKTOP;

type Draft = BannerPayload & { id?: string };

const emptyDraft = (sortOrder: number): Draft => ({
  title: "Banner",
  subtitle: null,
  imageUrl: "",
  linkUrl: "",
  placement: HOME_PLACEMENT,
  sortOrder,
  isActive: true,
  startsAt: null,
  endsAt: null,
});

function toPayload(draft: Draft): BannerPayload {
  return {
    title: draft.title?.trim() || "Banner",
    subtitle: null,
    imageUrl: draft.imageUrl.trim(),
    linkUrl: draft.linkUrl?.trim() || null,
    placement: HOME_PLACEMENT,
    sortOrder: draft.sortOrder,
    isActive: draft.isActive,
    startsAt: null,
    endsAt: null,
  };
}

/** Ana sayfa kayan banner — görsel + yönlendirme linki. */
export default function BannersPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["home-banners"],
    queryFn: () => getBanners(HOME_PLACEMENT),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["home-banners"] });

  const save = useMutation({
    mutationFn: (item: Draft) => {
      const payload = toPayload(item);
      return item.id ? updateBanner(item.id, payload) : createBanner(payload);
    },
    onSuccess: () => {
      toast.success("Banner kaydedildi. Vitrinde birkaç saniye içinde görünür.");
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner silindi.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleUpload = async (file?: File | null) => {
    if (!file || !draft) return;

    setUploading(true);
    try {
      const result = await uploadImage(file);
      setDraft({ ...draft, imageUrl: result.url });
      toast.success("Görsel yüklendi.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const openEdit = (banner: Banner) =>
    setDraft({
      id: banner.id,
      title: banner.title || "Banner",
      subtitle: null,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? "",
      placement: HOME_PLACEMENT,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startsAt: null,
      endsAt: null,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bannerlar</h1>
        <p className="text-sm text-muted-foreground">
          Web / masaüstü ana sayfa kayan görselleri. Yazı görselin içinde olsun; buradan
          yalnızca görsel ve tıklanınca gidilecek adresi yönetin. Mobil için{" "}
          <Link href="/mobile-banners" className="underline underline-offset-2">
            Mobil Bannerlar
          </Link>{" "}
          sayfasını kullanın.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{banners.length} slayt</CardTitle>
          <Button size="sm" onClick={() => setDraft(emptyDraft(banners.length))}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni banner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
          ) : banners.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Henüz banner yok. Yeni banner ile görsel ekleyin.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className="relative aspect-[16/7] bg-muted">
                    {banner.imageUrl ? (
                      <Image
                        src={resolveImageUrl(banner.imageUrl)}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : null}
                    <Badge
                      className="absolute left-3 top-3"
                      variant={banner.isActive ? "default" : "secondary"}
                    >
                      {banner.isActive ? "Yayında" : "Pasif"}
                    </Badge>
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="truncate text-sm text-muted-foreground">
                      {banner.linkUrl || "Yönlendirme yok"}
                    </p>
                    <p className="text-xs text-muted-foreground">Sıra: {banner.sortOrder}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(banner)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Bu banner silinsin mi?")) remove.mutate(banner.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Banner düzenle" : "Yeni banner"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Görsel</Label>
                <p className="text-xs text-muted-foreground">
                  Önerilen ölçü yaklaşık 1920×800. Metin varsa görsele gömülü olsun.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={draft.imageUrl}
                    onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                    placeholder="Görsel yükleyin veya URL yapıştırın"
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
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
                {draft.imageUrl && (
                  <div className="relative aspect-[16/7] w-full overflow-hidden rounded border bg-muted">
                    <Image
                      src={resolveImageUrl(draft.imageUrl)}
                      alt="Önizleme"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-link">Yönlendirme linki</Label>
                <Input
                  id="banner-link"
                  value={draft.linkUrl ?? ""}
                  onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                  placeholder="/products veya https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-order">Sıra</Label>
                  <Input
                    id="banner-order"
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setDraft({ ...draft, sortOrder: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.isActive ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, isActive: true })}
                    >
                      Yayında
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!draft.isActive ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, isActive: false })}
                    >
                      Pasif
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                if (!draft) return;
                if (!draft.imageUrl.trim()) {
                  toast.error("Görsel zorunlu.");
                  return;
                }
                save.mutate(draft);
              }}
              disabled={save.isPending}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
