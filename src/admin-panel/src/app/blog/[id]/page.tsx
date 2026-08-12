"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlogPost,
  createBlogTag,
  getBlogCategories,
  getBlogPost,
  getBlogTags,
  resolveImageUrl,
  updateBlogPost,
  uploadImage,
  type BlogPostPayload,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

const empty: BlogPostPayload = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  authorName: "Yıldırım Store",
  readingTimeMinutes: 3,
  isPublished: false,
  isFeatured: false,
  publishedAt: null,
  metaTitle: "",
  metaDescription: "",
  blogCategoryId: null,
  tagIds: [],
};

export default function BlogEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string | undefined;
  const isNew = !id || id === "new";

  const [form, setForm] = useState<BlogPostPayload>(empty);
  const [newTag, setNewTag] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: getBlogCategories,
  });

  const { data: tags = [], refetch: refetchTags } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: getBlogTags,
  });

  const { data: existing } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: () => getBlogPost(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title,
      slug: existing.slug,
      excerpt: existing.excerpt ?? "",
      content: existing.content,
      coverImageUrl: existing.coverImageUrl ?? "",
      authorName: existing.authorName ?? "",
      readingTimeMinutes: existing.readingTimeMinutes,
      isPublished: existing.isPublished,
      isFeatured: existing.isFeatured,
      publishedAt: existing.publishedAt,
      metaTitle: existing.metaTitle ?? "",
      metaDescription: existing.metaDescription ?? "",
      blogCategoryId: existing.blogCategoryId,
      tagIds: existing.tagIds ?? [],
    });
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return createBlogPost(form);
      return updateBlogPost(id!, form);
    },
    onSuccess: (res) => {
      toast.success("Yazı kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      if (isNew) router.replace(`/blog/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTag = (tagId: string) => {
    const current = form.tagIds ?? [];
    setForm({
      ...form,
      tagIds: current.includes(tagId)
        ? current.filter((x) => x !== tagId)
        : [...current, tagId],
    });
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setForm({ ...form, coverImageUrl: result.url });
      toast.success("Kapak görseli yüklendi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    try {
      const tag = await createBlogTag({ name: newTag.trim() });
      await refetchTags();
      setForm({ ...form, tagIds: [...(form.tagIds ?? []), tag.id] });
      setNewTag("");
      toast.success("Etiket eklendi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Etiket eklenemedi");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isNew ? "Yeni Blog Yazısı" : "Yazıyı Düzenle"}
        </h1>
        <Button
          disabled={!form.title.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İçerik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Başlık</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Boş bırakılırsa başlıktan üretilir"
            />
          </div>
          <div className="space-y-2">
            <Label>Özet</Label>
            <textarea
              value={form.excerpt ?? ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>İçerik (HTML destekli)</Label>
            <textarea
              value={form.content ?? ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="min-h-[280px] w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kapak & Yayın</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.coverImageUrl && (
            <img
              src={resolveImageUrl(form.coverImageUrl)}
              alt=""
              className="h-40 w-full rounded-lg object-cover"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            {uploading ? "Yükleniyor..." : "Kapak görseli yükle"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Yazar</Label>
              <Input
                value={form.authorName ?? ""}
                onChange={(e) =>
                  setForm({ ...form, authorName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Okuma süresi (dk)</Label>
              <Input
                type="number"
                value={form.readingTimeMinutes ?? 3}
                onChange={(e) =>
                  setForm({
                    ...form,
                    readingTimeMinutes: Number(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <select
              value={form.blogCategoryId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  blogCategoryId: e.target.value || null,
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">(Yok)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    form.tagIds?.includes(tag.id)
                      ? "border-foreground bg-foreground text-white"
                      : ""
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Yeni etiket"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Ekle
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
            />
            Yayınla
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm({ ...form, isFeatured: e.target.checked })
              }
            />
            Öne çıkan
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta başlık</Label>
            <Input
              value={form.metaTitle ?? ""}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Meta açıklama</Label>
            <textarea
              value={form.metaDescription ?? ""}
              onChange={(e) =>
                setForm({ ...form, metaDescription: e.target.value })
              }
              className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
