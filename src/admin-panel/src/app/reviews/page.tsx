"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteReview,
  getReviews,
  moderateReview,
  resolveImageUrl,
} from "@/lib/api";
import type { AdminReview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgeCheck, Check, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type Filter = "pending" | "approved" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Onay bekleyenler" },
  { value: "approved", label: "Yayında" },
  { value: "all", label: "Tümü" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const approvedParam =
    filter === "all" ? undefined : filter === "approved";

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", filter],
    queryFn: () => getReviews(approvedParam),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reviews"] });

  const moderate = useMutation({
    mutationFn: ({
      id,
      isApproved,
      moderatorNote,
    }: {
      id: string;
      isApproved: boolean;
      moderatorNote?: string;
    }) => moderateReview(id, { isApproved, moderatorNote }),
    onSuccess: (_, variables) => {
      toast.success(variables.isApproved ? "Yorum yayınlandı." : "Yorum yayından kaldırıldı.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      toast.success("Yorum silindi.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ürün Yorumları</h1>
          <p className="text-sm text-muted-foreground">
            Yorumlar onaylanmadan mağaza tarafında görünmez.
          </p>
        </div>

        <div className="flex gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {reviews.length} yorum
            {filter !== "approved" && pendingCount > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600">
                ({pendingCount} onay bekliyor)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
          ) : reviews.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Bu filtrede yorum bulunmuyor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Puan</TableHead>
                  <TableHead>Yorum</TableHead>
                  <TableHead>Moderatör notu</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    note={notes[review.id] ?? review.moderatorNote ?? ""}
                    onNoteChange={(value) =>
                      setNotes((prev) => ({ ...prev, [review.id]: value }))
                    }
                    onModerate={(isApproved) =>
                      moderate.mutate({
                        id: review.id,
                        isApproved,
                        moderatorNote: notes[review.id] ?? review.moderatorNote ?? undefined,
                      })
                    }
                    onDelete={() => {
                      if (confirm("Bu yorumu kalıcı olarak silmek istiyor musunuz?")) {
                        remove.mutate(review.id);
                      }
                    }
                  }
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({
  review,
  note,
  onNoteChange,
  onModerate,
  onDelete,
}: {
  review: AdminReview;
  note: string;
  onNoteChange: (value: string) => void;
  onModerate: (isApproved: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-[180px] truncate font-medium">
        {review.productName}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {review.userName}
          {review.isVerifiedPurchase && (
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Doğrulanmış alışveriş" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {review.rating}
        </span>
      </TableCell>
      <TableCell className="max-w-[320px]">
        {review.title && <p className="font-medium">{review.title}</p>}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {review.comment || "-"}
        </p>
        {(review.imageUrls?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {review.imageUrls!.map((url) => (
              <a
                key={url}
                href={resolveImageUrl(url)}
                target="_blank"
                rel="noreferrer"
                className="relative h-10 w-10 overflow-hidden rounded border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="min-w-[160px]">
        <Input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Moderatör notu"
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDate(review.createdAt)}
      </TableCell>
      <TableCell>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            review.isApproved
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {review.isApproved ? "Yayında" : "Bekliyor"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {review.isApproved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onModerate(false)}
              title="Yayından kaldır"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => onModerate(true)} title="Onayla">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDelete} title="Sil">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
