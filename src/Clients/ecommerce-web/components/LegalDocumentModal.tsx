"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { API_URL } from "@/lib/api";

type Props = {
  slug: string;
  title: string;
  open: boolean;
  onClose: () => void;
};

/** Checkout’ta sözleşmeleri sayfaya çıkmadan modalda gösterir. */
export default function LegalDocumentModal({ slug, title, open, onClose }: Props) {
  const titleId = useId();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`${API_URL}/catalog/cms/pages/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        return res.json() as Promise<{ title?: string; content?: string | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        setContent(data.content || `<p>${data.title || title}</p>`);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setContent(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, title]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-muted hover:text-foreground"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700">
          {loading && <p className="text-muted-foreground">Yükleniyor…</p>}
          {!loading && error && (
            <p className="text-muted-foreground">
              Belge şu an görüntülenemiyor. Lütfen daha sonra tekrar deneyin.
            </p>
          )}
          {!loading && !error && content && (
            <div
              className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>

        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
