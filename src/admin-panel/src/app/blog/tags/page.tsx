"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBlogTag, deleteBlogTag, getBlogTags } from "@/lib/api";
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

export default function BlogTagsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: tags = [] } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: getBlogTags,
  });

  const saveMutation = useMutation({
    mutationFn: () => createBlogTag({ name }),
    onSuccess: () => {
      toast.success("Etiket eklendi.");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogTag,
    onSuccess: () => {
      toast.success("Etiket silindi.");
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Blog Etiketleri</h1>

      <div className="flex max-w-lg gap-2">
        <div className="flex-1 space-y-2">
          <Label>Etiket adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          className="mt-7"
          disabled={!name.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Ekle
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Henüz etiket yok.
              </TableCell>
            </TableRow>
          ) : (
            tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="font-mono text-sm">{tag.slug}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`"${tag.name}" silinsin mi?`)) {
                        deleteMutation.mutate(tag.id);
                      }
                    }}
                  >
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
