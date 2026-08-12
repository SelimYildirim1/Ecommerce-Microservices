"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/client-api";
import type { ProductQuestion } from "@/lib/catalog";
import { notify } from "@/lib/feedback";

export default function ProductQnA({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getProductQuestions(productId));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !question.trim()) return;

    setSubmitting(true);
    try {
      await api.createProductQuestion(productId, {
        question: question.trim(),
        userName: user.name || "Müşteri",
        email: user.email,
      });
      setQuestion("");
      notify.success("Sorunuz alındı. Yanıtlandıktan sonra yayınlanacak.");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Soru gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-14 border-t border-border pt-10">
      <h2 className="font-display mb-6 text-2xl font-bold">Soru &amp; Cevap</h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="border border-border rounded-2xl p-5 bg-white h-fit">
          <h3 className="mb-3 text-sm font-semibold">Ürün hakkında soru sorun</h3>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              Soru sormak için{" "}
              <Link href="/login" className="font-medium text-foreground underline">
                giriş yapın
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Sorunuzu yazın..."
                rows={4}
                maxLength={1000}
                required
                className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !question.trim()}
                className="w-full rounded-md bg-foreground py-2 text-sm font-medium text-white transition hover:bg-foreground/85 disabled:opacity-50"
              >
                {submitting ? "Gönderiliyor..." : "Soruyu gönder"}
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
              Henüz onaylanmış soru yok. İlk soruyu siz sorun.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-white p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    S: {item.question}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.userName} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                  {item.answer ? (
                    <div className="mt-3 rounded-xl bg-cream/70 px-3 py-2 text-sm text-gray-700">
                      <span className="font-semibold">C: </span>
                      {item.answer}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600">Yanıt bekleniyor</p>
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
