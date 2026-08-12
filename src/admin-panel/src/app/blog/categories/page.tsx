"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlogCategory,
  deleteBlogCategory,
  getBlogCategories,
  updateBlogCategory,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function BlogCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: getBlogCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return updateBlogCategory(editingId, { name });
      return createBlogCategory({ name });
    },
    onSuccess: () => {
      toast.success("Kategori kaydedildi.");
      setName("");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogCategory,
    onSuccess: () => {
      toast.success("Kategori silindi.");
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Blog Kategorileri</h1>

      <div className="flex max-w-lg gap-2">
        <div className="flex-1 space-y-2">
          <Label>Kategori adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          className="mt-7"
          disabled={!name.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {editingId ? "Güncelle" : "Ekle"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Yazı</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell className="font-mono text-sm">{c.slug}</TableCell>
              <TableCell>{c.postCount ?? 0}</TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(c.id);
                    setName(c.name);
                  }}
                >
                  Düzenle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Silinsin mi?")) deleteMutation.mutate(c.id);
                  }}
                >
                  Sil
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
