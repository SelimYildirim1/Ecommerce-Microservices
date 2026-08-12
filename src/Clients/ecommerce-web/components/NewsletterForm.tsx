"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";

interface Props {
  variant?: "footer" | "inline";
}

export default function NewsletterForm({ variant = "footer" }: Props) {
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

  if (variant === "footer") {
    return (
      <form onSubmit={submit} className="mt-6 max-w-sm">
        <p className="mb-2 text-sm font-semibold text-gray-900">Bülten</p>
        <p className="mb-3 text-xs text-gray-500">
          Kampanya ve yeniliklerden haberdar olun.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-foreground px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? "..." : "Abone ol"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta"
        className="h-11 flex-1 rounded-lg border border-border px-4 text-sm"
      />
      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-foreground px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        Abone ol
      </button>
    </form>
  );
}
