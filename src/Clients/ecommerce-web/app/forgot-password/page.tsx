"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <h1 className="font-display text-3xl font-bold">Şifremi unuttum</h1>
        {done ? (
          <p className="text-sm text-muted-foreground">
            Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutunuzu
            (ve spam klasörünü) kontrol edin.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
              className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-foreground text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
            </button>
          </form>
        )}
        <Link href="/login" className="text-sm text-muted-foreground underline">
          Girişe dön
        </Link>
      </div>
    </main>
  );
}
