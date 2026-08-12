"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkPublishBlogPosts,
  deleteBlogPost,
  getBlogPosts,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function BlogPostsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", q, status],
    queryFn: () =>
      getBlogPosts({
        q: q || undefined,
        status: status || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => {
      toast.success("Yazı silindi.");
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: bulkPublishBlogPosts,
    onSuccess: (r) => {
      toast.success(`${r.count} yazı yayınlandı.`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Blog Yazıları</h1>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button
              variant="outline"
              onClick={() => publishMutation.mutate(selected)}
            >
              Seçilenleri yayınla ({selected.length})
            </Button>
          )}
          <Button asChild>
            <Link href="/blog/new">
              <Plus className="mr-2 h-4 w-4" /> Yeni Yazı
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Ara..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Tümü</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Görüntülenme</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(post.id)}
                    onChange={() => toggle(post.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{post.title}</div>
                  <div className="text-xs text-muted-foreground">/{post.slug}</div>
                </TableCell>
                <TableCell>
                  {post.isPublished ? (
                    <Badge className="bg-emerald-100 text-emerald-800">Yayında</Badge>
                  ) : (
                    <Badge variant="secondary">Taslak</Badge>
                  )}
                  {post.isFeatured && (
                    <Badge className="ml-1 bg-amber-100 text-amber-800">Öne çıkan</Badge>
                  )}
                </TableCell>
                <TableCell>{post.category?.name ?? "—"}</TableCell>
                <TableCell>{post.viewCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/blog/${post.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Yazı silinsin mi?"))
                        deleteMutation.mutate(post.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
