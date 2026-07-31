"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [token] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      if (!res.ok) {
        const text = await res.text();
        notify.error(parseApiError(text, "Şifre sıfırlanamadı. Bağlantıyı kontrol edin."));
        return;
      }
      notify.success("Şifreniz güncellendi. Giriş yapabilirsiniz.");
      router.push("/login");
    } catch {
      notify.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta"
        className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm"
      />
      <input
        type="password"
        required
        minLength={4}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Yeni şifre"
        className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm"
      />
      <button
        type="submit"
        disabled={loading || !token}
        className="w-full py-3 bg-foreground text-white rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : "Şifreyi güncelle"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <h1 className="font-display text-3xl font-bold">Yeni şifre</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Yükleniyor...</p>}>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="text-sm text-muted-foreground underline">
          Girişe dön
        </Link>
      </div>
    </main>
  );
}
