"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";
import { useAuth } from "@/context/AuthContext";

interface Props {
  productId: string;
}

export default function StockAlertForm({ productId }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/catalog/stock-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          email: email.trim(),
          userId: user?.id ?? null,
        }),
      });
      if (!res.ok) {
        throw new Error(
          parseApiError(await res.text(), "Bildirim kaydı oluşturulamadı."),
        );
      }
      const data = await res.json().catch(() => null);
      notify.success(data?.message ?? "Stok geldiğinde bilgilendireceğiz.");
      setDone(true);
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : "Bildirim kaydı oluşturulamadı.",
      );
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <p className="mt-4 text-sm text-success">
        Kaydınız alındı. Stok geldiğinde e-posta ile haber vereceğiz.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">Stokta yoksa haber ver</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-posta adresiniz"
          className="h-10 flex-1 rounded-lg border border-border px-3 text-sm focus:border-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {sending ? "Kaydediliyor..." : "Bildir"}
        </button>
      </div>
    </form>
  );
}
