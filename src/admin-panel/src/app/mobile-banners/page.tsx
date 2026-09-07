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
import { Loader2, Pencil, Plus, Smartphone, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    title: draft.title?.trim() || "",
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

function upsertBanner(list: Banner[] | undefined, saved: Banner): Banner[] {
  const current = list ?? [];
  const index = current.findIndex((item) => item.id === saved.id);
  const next = index >= 0 ? current.map((item, i) => (i === index ? saved : item)) : [...current, saved];
  return [...next].sort((a, b) => a.sortOrder - b.sortOrder);
}

function BannerThumb({
  src,
  uploading = false,
  className = "",
  emptyLabel = "",
}: {
  src: string;
  uploading?: boolean;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`} style={{ aspectRatio: ASPECT }}>
      {src ? (
        // Yeni yüklenen blob/gateway görseli Next/Image beklemeden hemen boyansın.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : emptyLabel ? (
        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : null}
      {uploading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs font-medium">Yükleniyor...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Mobil cihazlarda gösterilen ana sayfa banner'ı. Web bannerlarından tamamen
 * bağımsızdır; mobilde bu liste boşsa vitrin web bannerlarına geri düşer.
 */
export default function MobileBannersPage() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [listPreviews, setListPreviews] = useState<Record<string, string>>({});

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["mobile-banners"],
    queryFn: () => getBanners(BANNER_PLACEMENT_MOBILE),
    staleTime: 0,
  });

  const replaceLocalPreview = (next: string | null) => {
    if (localPreviewRef.current && localPreviewRef.current !== next) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
    localPreviewRef.current = next;
    setLocalPreview(next);
  };

  useEffect(
    () => () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    },
    [],
  );

  const closeDraft = () => {
    setDraft(null);
    replaceLocalPreview(null);
  };

  const save = useMutation({
    mutationFn: (item: Draft) => {
      const payload = toPayload(item);
      return item.id ? updateBanner(item.id, payload) : createBanner(payload);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData<Banner[]>(["mobile-banners"], (old) => upsertBanner(old, saved));
      if (localPreviewRef.current) {
        const blob = localPreviewRef.current;
        localPreviewRef.current = null;
        setListPreviews((prev) => ({ ...prev, [saved.id]: blob }));
      }
      setLocalPreview(null);
      setDraft(null);
      toast.success("Mobil banner kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["mobile-banners"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Banner[]>(["mobile-banners"], (old) =>
        (old ?? []).filter((item) => item.id !== id),
      );
      setListPreviews((prev) => {
        const blob = prev[id];
        if (blob) URL.revokeObjectURL(blob);
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Mobil banner silindi.");
      queryClient.invalidateQueries({ queryKey: ["mobile-banners"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleUpload = async (file?: File | null) => {
    if (!file || !draft) return;

    replaceLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setDraft((current) => (current ? { ...current, imageUrl: result.url } : current));
      toast.success("Görsel yüklendi.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const openEdit = (banner: Banner) => {
    replaceLocalPreview(null);
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
  };

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
          <Button
            size="sm"
            onClick={() => {
              replaceLocalPreview(null);
              setDraft(emptyDraft(banners.length));
            }}
          >
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
                  <div className="relative">
                    <BannerThumb
                      src={listPreviews[banner.id] || resolveImageUrl(banner.imageUrl)}
                    />
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

      <Dialog open={draft !== null} onOpenChange={(open) => !open && closeDraft()}>
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
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => fileInput.current?.click()}
                >
                  <BannerThumb
                    src={localPreview || resolveImageUrl(draft.imageUrl)}
                    uploading={uploading}
                    className="mx-auto w-full max-w-[220px] rounded border"
                    emptyLabel="Görsel seçin"
                  />
                </button>
                <p className="text-xs text-muted-foreground">
                  {uploading
                    ? "Görsel sunucuya yükleniyor; önizleme şimdi görünür."
                    : "Kutuya tıklayarak görsel seçin. Önizleme dosyayı seçer seçmez çıkar."}
                </p>
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
            <Button variant="outline" onClick={closeDraft}>
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
              disabled={save.isPending || uploading}
            >
              {save.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
