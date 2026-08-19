"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBanner,
  createStaticPage,
  deleteBanner,
  deleteStaticPage,
  getBanners,
  getStaticPages,
  resolveImageUrl,
  updateBanner,
  updateStaticPage,
  uploadImage,
} from "@/lib/api";
import type { BannerPayload, StaticPagePayload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

const PLACEMENTS = [
  { value: "home-strip", label: "Ana sayfa şerit" },
  { value: "category-top", label: "Kategori üstü" },
];

const emptyBanner = (): BannerPayload => ({
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  placement: "home-strip",
  sortOrder: 0,
  isActive: true,
  startsAt: null,
  endsAt: null,
});

const emptyPage = (): StaticPagePayload => ({
  slug: "",
  title: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: true,
  showInFooter: true,
  sortOrder: 0,
});

/** ISO tarihi datetime-local girisinin bekledigi bicime cevirir. */
const toLocalInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : "");

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">İçerik Yönetimi</h1>
        <p className="text-sm text-muted-foreground">
          Ana sayfa kayan banner için sol menüden{" "}
          <Link href="/banners" className="underline underline-offset-2">
            Bannerlar
          </Link>
          . Bu sekme diğer konumlar (şerit, kategori, mega menü) içindir.
        </p>
      </div>

      <Tabs defaultValue="banners">
        <TabsList>
          <TabsTrigger value="banners">Bannerlar</TabsTrigger>
          <TabsTrigger value="pages">Statik sayfalar</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="mt-4">
          <BannersTab />
        </TabsContent>
        <TabsContent value="pages" className="mt-4">
          <PagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BannersTab() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<(BannerPayload & { id?: string }) | null>(null);

  const { data: allBanners = [], isLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: () => getBanners(),
  });
  const banners = allBanners.filter((banner) => banner.placement !== "home-slider");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["banners"] });

  const save = useMutation({
    mutationFn: ({ id, ...payload }: BannerPayload & { id?: string }) =>
      id ? updateBanner(id, payload) : createBanner(payload),
    onSuccess: () => {
      toast.success("Banner kaydedildi.");
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{banners.length} banner</CardTitle>
        <Button size="sm" onClick={() => setDraft(emptyBanner())}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni banner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
        ) : banners.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            Henüz banner eklenmedi.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Görsel</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Sıra</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    {banner.imageUrl ? (
                      <div className="relative h-10 w-20 overflow-hidden rounded border bg-muted">
                        <Image
                          src={resolveImageUrl(banner.imageUrl)}
                          alt={banner.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{banner.title}</p>
                    {banner.subtitle && (
                      <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {PLACEMENTS.find((p) => p.value === banner.placement)?.label ??
                      banner.placement}
                  </TableCell>
                  <TableCell>{banner.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={banner.isActive ? "default" : "secondary"}>
                      {banner.isActive ? "Yayında" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            id: banner.id,
                            title: banner.title,
                            subtitle: banner.subtitle ?? "",
                            imageUrl: banner.imageUrl,
                            linkUrl: banner.linkUrl ?? "",
                            placement: banner.placement,
                            sortOrder: banner.sortOrder,
                            isActive: banner.isActive,
                            startsAt: banner.startsAt ?? null,
                            endsAt: banner.endsAt ?? null,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Banner düzenle" : "Yeni banner"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner-title">Başlık</Label>
                <Input
                  id="banner-title"
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-subtitle">Alt başlık</Label>
                <Input
                  id="banner-subtitle"
                  value={draft.subtitle ?? ""}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-image">Görsel</Label>
                <div className="flex gap-2">
                  <Input
                    id="banner-image"
                    value={draft.imageUrl}
                    onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                    placeholder="/uploads/... veya tam URL"
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
                  <div className="relative h-28 w-full overflow-hidden rounded border bg-muted">
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
                <Label htmlFor="banner-link">Bağlantı</Label>
                <Input
                  id="banner-link"
                  value={draft.linkUrl ?? ""}
                  onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                  placeholder="/products?categoryId=..."
                />
              </div>

              <div className="space-y-2">
                <Label>Konum</Label>
                <div className="flex flex-wrap gap-2">
                  {PLACEMENTS.map((placement) => (
                    <Button
                      key={placement.value}
                      type="button"
                      size="sm"
                      variant={draft.placement === placement.value ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, placement: placement.value })}
                    >
                      {placement.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-start">Yayın başlangıcı</Label>
                  <Input
                    id="banner-start"
                    type="datetime-local"
                    value={toLocalInput(draft.startsAt)}
                    onChange={(e) =>
                      setDraft({ ...draft, startsAt: e.target.value || null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="banner-end">Yayın bitişi</Label>
                  <Input
                    id="banner-end"
                    type="datetime-local"
                    value={toLocalInput(draft.endsAt)}
                    onChange={(e) => setDraft({ ...draft, endsAt: e.target.value || null })}
                  />
                </div>
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
                if (!draft.title?.trim() || !draft.imageUrl.trim()) {
                  toast.error("Başlık ve görsel zorunlu.");
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
    </Card>
  );
}

function PagesTab() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<(StaticPagePayload & { id?: string }) | null>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["static-pages"],
    queryFn: getStaticPages,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["static-pages"] });

  const save = useMutation({
    mutationFn: ({ id, ...payload }: StaticPagePayload & { id?: string }) =>
      id ? updateStaticPage(id, payload) : createStaticPage(payload),
    onSuccess: () => {
      toast.success("Sayfa kaydedildi.");
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStaticPage(id),
    onSuccess: () => {
      toast.success("Sayfa silindi.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{pages.length} sayfa</CardTitle>
        <Button size="sm" onClick={() => setDraft(emptyPage())}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni sayfa
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
        ) : pages.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            Henüz statik sayfa eklenmedi.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Sıra</TableHead>
                <TableHead>Alt menü</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    /{page.slug}
                  </TableCell>
                  <TableCell>{page.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={page.showInFooter ? "secondary" : "outline"}>
                      {page.showInFooter ? "Görünür" : "Gizli"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={page.isPublished ? "default" : "secondary"}>
                      {page.isPublished ? "Yayında" : "Taslak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDraft({
                            id: page.id,
                            slug: page.slug,
                            title: page.title,
                            content: page.content ?? "",
                            metaTitle: page.metaTitle ?? "",
                            metaDescription: page.metaDescription ?? "",
                            isPublished: page.isPublished,
                            showInFooter: page.showInFooter,
                            sortOrder: page.sortOrder,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Bu sayfa silinsin mi?")) remove.mutate(page.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Sayfa düzenle" : "Yeni sayfa"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-title">Başlık</Label>
                  <Input
                    id="page-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-slug">Adres</Label>
                  <Input
                    id="page-slug"
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    placeholder="Boş bırakılırsa başlıktan üretilir"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-content">İçerik (HTML)</Label>
                <Textarea
                  id="page-content"
                  rows={10}
                  value={draft.content ?? ""}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="page-meta-title">Meta başlık</Label>
                  <Input
                    id="page-meta-title"
                    value={draft.metaTitle ?? ""}
                    onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page-order">Sıra</Label>
                  <Input
                    id="page-order"
                    type="number"
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setDraft({ ...draft, sortOrder: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-meta-description">Meta açıklama</Label>
                <Textarea
                  id="page-meta-description"
                  rows={2}
                  value={draft.metaDescription ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, metaDescription: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yayın durumu</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.isPublished ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, isPublished: true })}
                    >
                      Yayında
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!draft.isPublished ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, isPublished: false })}
                    >
                      Taslak
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alt menüde göster</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={draft.showInFooter ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, showInFooter: true })}
                    >
                      Evet
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!draft.showInFooter ? "default" : "outline"}
                      onClick={() => setDraft({ ...draft, showInFooter: false })}
                    >
                      Hayır
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
                if (!draft.title.trim()) {
                  toast.error("Başlık zorunlu.");
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
    </Card>
  );
}
