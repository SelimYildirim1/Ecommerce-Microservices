"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";
import { useAuth } from "@/context/AuthContext";

interface Props {
  slug: string;
}

export default function BlogCommentForm({ slug }: Props) {
  const { user } = useAuth();
  const [authorName, setAuthorName] = useState(user?.name ?? "");
  const [authorEmail, setAuthorEmail] = useState(user?.email ?? "");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) {
      notify.error("Ad ve yorum zorunludur.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `${API_URL}/catalog/blog/posts/${encodeURIComponent(slug)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName: authorName.trim(),
            authorEmail: authorEmail.trim() || null,
            content: content.trim(),
            userId: user?.id ?? null,
          }),
        },
      );

      if (!res.ok) {
        const raw = await res.text();
        throw new Error(parseApiError(raw, "Yorum gönderilemedi."));
      }

      const data = await res.json().catch(() => null);
      notify.success(
        data?.message ??
          "Yorumunuz alındı. Onaylandıktan sonra yayınlanacak.",
      );
      setContent("");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border p-5">
      <h3 className="text-lg font-semibold">Yorum yaz</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Adınız
          </label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-border px-4 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            E-posta (opsiyonel)
          </label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            className="h-11 w-full rounded-lg border border-border px-4 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Yorumunuz
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {sending ? "Gönderiliyor..." : "Yorumu gönder"}
      </button>
    </form>
  );
}
