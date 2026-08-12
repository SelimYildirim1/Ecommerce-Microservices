"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";

export default function BlogNewsletterCard() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/catalog/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        throw new Error(parseApiError(await res.text(), "Abone olunamadı."));
      }
      const data = await res.json().catch(() => null);
      notify.success(data?.message ?? "Bültene abone oldunuz.");
      setEmail("");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Abone olunamadı.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-foreground px-6 py-7 text-background">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/10">
        <Mail className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">Bültene Katılın</h3>
      <p className="mt-2 text-sm leading-relaxed text-background/70">
        E-ticaret trendleri, kampanya ipuçları ve mağaza haberlerini e-postanıza
        gönderelim.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          className="h-11 w-full rounded-xl border border-background/20 bg-background/5 px-4 text-sm text-background placeholder:text-background/50 focus:border-background focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="h-11 w-full rounded-xl bg-background text-sm font-semibold text-foreground transition hover:bg-background/90 disabled:opacity-60"
        >
          {sending ? "Gönderiliyor..." : "Abone Ol"}
        </button>
      </form>
    </div>
  );
}
