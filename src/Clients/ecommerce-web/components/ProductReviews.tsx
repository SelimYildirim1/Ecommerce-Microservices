"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StarRating from "./StarRating";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/client-api";
import type { Review, ReviewSummary } from "@/lib/catalog";

export default function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.getReviews(productId),
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
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await api.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        userId: user.id,
        userName: user.name || "Müşteri",
      });

      setTitle("");
      setComment("");
      setRating(5);
      setNotice("Yorumunuz alındı. Onaylandıktan sonra yayınlanacak.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const total = summary?.totalCount ?? 0;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold mb-6">Değerlendirmeler</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ozet */}
        <div className="lg:col-span-1">
          <div className="border border-border rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">
                {(summary?.averageRating ?? 0).toFixed(1)}
              </span>
              <div>
                <StarRating value={summary?.averageRating ?? 0} size="md" />
                <p className="text-xs text-muted-foreground mt-1">
                  {total} değerlendirme
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary?.distribution?.[String(star)] ?? 0;
                const percent = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-muted-foreground">{star}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Yorum formu */}
          <div className="border border-border rounded-2xl p-5 bg-white mt-4">
            <h3 className="text-sm font-semibold mb-3">Bu ürünü değerlendirin</h3>

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
                  className="w-full h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
                />

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-foreground resize-none"
                />

                {error && <p className="text-xs text-danger">{error}</p>}
                {notice && <p className="text-xs text-success">{notice}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 rounded-md bg-foreground text-white text-sm font-medium hover:bg-foreground/85 disabled:opacity-50 transition"
                >
                  {submitting ? "Gönderiliyor..." : "Değerlendirmeyi gönder"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl py-16 text-center">
              <p className="text-muted-foreground">
                Bu ürün için henüz onaylanmış bir değerlendirme yok.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <article key={review.id} className="border border-border rounded-2xl p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{review.userName}</p>
                        <StarRating value={review.rating} />
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </time>
                  </div>

                  {review.title && (
                    <h4 className="text-sm font-semibold mt-3">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
