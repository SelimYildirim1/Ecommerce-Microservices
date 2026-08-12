"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBlogComment,
  getBlogComments,
  moderateBlogComment,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

export default function BlogCommentsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  const approved =
    filter === "all" ? undefined : filter === "approved";

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["blog-comments", filter],
    queryFn: () => getBlogComments(approved),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) =>
      moderateBlogComment(id, ok),
    onSuccess: () => {
      toast.success("Yorum güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["blog-comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogComment,
    onSuccess: () => {
      toast.success("Yorum silindi.");
      queryClient.invalidateQueries({ queryKey: ["blog-comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog Yorumları</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="pending">Onay bekleyen</option>
          <option value="approved">Onaylı</option>
          <option value="all">Tümü</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground">Yorum yok.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.authorName}</span>
                {c.isApproved ? (
                  <Badge className="bg-emerald-100 text-emerald-800">Onaylı</Badge>
                ) : (
                  <Badge variant="secondary">Bekliyor</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {c.post.title}
                </span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
              <div className="mt-3 flex gap-2">
                {!c.isApproved && (
                  <Button
                    size="sm"
                    onClick={() =>
                      moderateMutation.mutate({ id: c.id, ok: true })
                    }
                  >
                    Onayla
                  </Button>
                )}
                {c.isApproved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      moderateMutation.mutate({ id: c.id, ok: false })
                    }
                  >
                    Onayı kaldır
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Silinsin mi?")) deleteMutation.mutate(c.id);
                  }}
                >
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
