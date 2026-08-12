"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ThumbsDown, ThumbsUp, Upload, X } from "lucide-react";
import StarRating from "./StarRating";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/client-api";
import { resolveMediaUrl, type Review, type ReviewSummary } from "@/lib/catalog";
import { notify } from "@/lib/feedback";

type SortKey = "newest" | "helpful" | "rating";

export default function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("newest");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.getReviews(productId, { sort, rating: ratingFilter }),
        api.getReviewSummary(productId),
      ]);
      setReviews(list);
      setSummary(stats);
    } catch {
      setReviews([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [productId, sort, ratingFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await api.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        userId: user.id,
        userName: user.name || "Müşteri",
        imageUrls: imageUrls.length ? imageUrls : undefined,
      });

      setTitle("");
      setComment("");
      setRating(5);
      setImageUrls([]);
      notify.success("Yorumunuz alındı. Onaylandıktan sonra yayınlanacak.");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - imageUrls.length)) {
        uploaded.push(await api.uploadMedia(file));
      }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const vote = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      notify.error("Oy vermek için giriş yapın.");
      return;
    }
    try {
      const updated = await api.voteReview(productId, reviewId, isHelpful);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Oy kaydedilemedi.");
    }
  };

  const total = summary?.totalCount ?? 0;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-display mb-6 text-2xl font-bold">Değerlendirmeler</h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">
                {(summary?.averageRating ?? 0).toFixed(1)}
              </span>
              <div>
                <StarRating value={summary?.averageRating ?? 0} size="md" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {total} değerlendirme
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary?.distribution?.[String(star)] ?? 0;
                const percent = total > 0 ? (count / total) * 100 : 0;
                const active = ratingFilter === star;

                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setRatingFilter((prev) => (prev === star ? undefined : star))
                    }
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs transition hover:bg-cream ${
                      active ? "bg-cream" : ""
                    }`}
                  >
                    <span className="w-3 text-muted-foreground">{star}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">Bu ürünü değerlendirin</h3>

            {!user ? (
              <p className="text-sm text-muted-foreground">
                Yorum yazmak için{" "}
                <Link href="/login" className="font-medium text-foreground underline">
                  giriş yapın
                </Link>
                .
              </p>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} yıldız`}
                      className={`text-2xl leading-none transition ${
                        star <= rating ? "text-amber-400" : "text-border"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Başlık (isteğe bağlı)"
                  maxLength={200}
                  className="h-9 w-full rounded-md border border-border px-3 text-sm focus:border-foreground focus:outline-none"
                />

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                />

                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Yükleniyor..." : "Fotoğraf ekle (max 6)"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading || imageUrls.length >= 6}
                      onChange={(e) => onUpload(e.target.files)}
                    />
                  </label>
                  {imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {imageUrls.map((url) => (
                        <div key={url} className="relative h-14 w-14 overflow-hidden rounded-lg">
                          <img
                            src={resolveMediaUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label="Kaldır"
                            onClick={() =>
                              setImageUrls((prev) => prev.filter((u) => u !== url))
                            }
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-foreground py-2 text-sm font-medium text-white transition hover:bg-foreground/85 disabled:opacity-50"
                >
                  {submitting ? "Gönderiliyor..." : "Değerlendirmeyi gönder"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["newest", "En yeni"],
                ["helpful", "En faydalı"],
                ["rating", "En yüksek puan"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === value
                    ? "bg-foreground text-white"
                    : "bg-cream text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="text-muted-foreground">
                Bu ürün için henüz onaylanmış bir değerlendirme yok.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-border bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{review.userName}</p>
                          {review.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <BadgeCheck className="h-3 w-3" />
                              Doğrulanmış Alışveriş
                            </span>
                          )}
                        </div>
                        <StarRating value={review.rating} />
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </time>
                  </div>

                  {review.title && (
                    <h4 className="mt-3 text-sm font-semibold">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  )}

                  {(review.imageUrls?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.imageUrls!.map((url) => (
                        <a
                          key={url}
                          href={resolveMediaUrl(url)}
                          target="_blank"
                          rel="noreferrer"
                          className="h-16 w-16 overflow-hidden rounded-lg border border-border"
                        >
                          <img
                            src={resolveMediaUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Bu yorum faydalı mı?</span>
                    <button
                      type="button"
                      onClick={() => vote(review.id, true)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-cream"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {review.helpfulCount ?? 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => vote(review.id, false)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-cream"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      {review.notHelpfulCount ?? 0}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
