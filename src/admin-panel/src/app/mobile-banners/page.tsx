"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BANNER_PLACEMENT_MOBILE,
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
import { Loader2, Pencil, Plus, Smartphone, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

/** Mobil banner için önerilen tasarım ölçüsü. */
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 523;
const ASPECT = `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}`;

type Draft = BannerPayload & { id?: string };

const emptyDraft = (sortOrder: number): Draft => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  ctaText: "",
  placement: BANNER_PLACEMENT_MOBILE,
  sortOrder,
  isActive: true,
  startsAt: null,
  endsAt: null,
});

function toPayload(draft: Draft): BannerPayload {
  return {
    title: draft.title?.trim() || "Mobil banner",
    subtitle: draft.subtitle?.trim() || null,
    imageUrl: draft.imageUrl.trim(),
    linkUrl: draft.linkUrl?.trim() || null,
    ctaText: draft.ctaText?.trim() || null,
    placement: BANNER_PLACEMENT_MOBILE,
    sortOrder: draft.sortOrder,
    isActive: draft.isActive,
    startsAt: null,
    endsAt: null,
  };
}

/**
 * Mobil cihazlarda gösterilen ana sayfa banner'ı. Web bannerlarından tamamen
 * bağımsızdır; mobilde bu liste boşsa vitrin web bannerlarına geri düşer.
 */
export default function MobileBannersPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["mobile-banners"],
    queryFn: () => getBanners(BANNER_PLACEMENT_MOBILE),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["mobile-banners"] });

  const save = useMutation({
    mutationFn: (item: Draft) => {
      const payload = toPayload(item);
      return item.id ? updateBanner(item.id, payload) : createBanner(payload);
    },
    onSuccess: () => {
      toast.success("Mobil banner kaydedildi. Vitrinde birkaç saniye içinde görünür.");
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      toast.success("Mobil banner silindi.");
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
      title: banner.title || "",
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? "",
      ctaText: banner.ctaText ?? "",
      placement: BANNER_PLACEMENT_MOBILE,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startsAt: null,
      endsAt: null,
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Smartphone className="h-6 w-6" />
          Mobil Bannerlar
        </h1>
        <p className="text-sm text-muted-foreground">
          Yalnızca mobil cihazlarda gösterilir; web/desktop bannerlarını etkilemez.
          Önerilen ölçü{" "}
          <strong>
            {DESIGN_WIDTH}×{DESIGN_HEIGHT} px
          </strong>
          . Burada banner yoksa mobilde web bannerları gösterilmeye devam eder.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{banners.length} slayt</CardTitle>
          <Button size="sm" onClick={() => setDraft(emptyDraft(banners.length))}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni mobil banner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
          ) : banners.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Henüz mobil banner yok. Yeni mobil banner ile görsel ekleyin.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {banners.map((banner) => (
                <div key={banner.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="relative bg-muted" style={{ aspectRatio: ASPECT }}>
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
                      className="absolute left-2 top-2"
                      variant={banner.isActive ? "default" : "secondary"}
                    >
                      {banner.isActive ? "Yayında" : "Pasif"}
                    </Badge>
                  </div>
                  <div className="space-y-2 p-3">
                    {banner.title && banner.title !== "Mobil banner" && (
                      <p className="truncate text-sm font-medium">{banner.title}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {banner.linkUrl || "Yönlendirme yok"}
                    </p>
                    {banner.ctaText && (
                      <p className="truncate text-xs text-muted-foreground">
                        Buton: {banner.ctaText}
                      </p>
                    )}
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
                          if (confirm("Bu mobil banner silinsin mi?")) remove.mutate(banner.id);
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
            <DialogTitle>
              {draft?.id ? "Mobil banner düzenle" : "Yeni mobil banner"}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Görsel</Label>
                <p className="text-xs text-muted-foreground">
                  Önerilen ölçü {DESIGN_WIDTH}×{DESIGN_HEIGHT} px (dikey / 3:4 civarı).
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
                  <div
                    className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded border bg-muted"
                    style={{ aspectRatio: ASPECT }}
                  >
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
                <Label htmlFor="mobile-banner-title">Başlık (opsiyonel)</Label>
                <Input
                  id="mobile-banner-title"
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Görselin üzerinde gösterilecek başlık"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile-banner-subtitle">Slogan (opsiyonel)</Label>
                <Input
                  id="mobile-banner-subtitle"
                  value={draft.subtitle ?? ""}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  placeholder="Başlığın altında gösterilecek kısa metin"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mobile-banner-cta">CTA buton yazısı</Label>
                  <Input
                    id="mobile-banner-cta"
                    value={draft.ctaText ?? ""}
                    onChange={(e) => setDraft({ ...draft, ctaText: e.target.value })}
                    placeholder="Örn. Keşfet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile-banner-link">Yönlendirme linki</Label>
                  <Input
                    id="mobile-banner-link"
                    value={draft.linkUrl ?? ""}
                    onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                    placeholder="/products veya https://..."
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Başlık, slogan ve buton yazısı boş bırakılırsa yalnızca görsel gösterilir.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile-banner-order">Sıra</Label>
                  <Input
                    id="mobile-banner-order"
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
