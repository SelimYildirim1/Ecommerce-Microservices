"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.token);
      } else {
        const text = await res.text();
        alert(text || "Giriş başarısız! Bilgileri kontrol edin.");
      }
    } catch (error) {
      console.error(error);
      alert("Bağlantı hatası!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-foreground text-base font-bold text-white">
              YS
            </span>
            <span className="text-lg font-semibold text-gray-900">Yıldırım Store</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-gray-900">
              Tekrar hoş geldiniz
            </h1>
            <p className="mt-2 text-sm text-gray-500">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                E-posta adresi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                placeholder="ornek@mail.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Şifre
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
                placeholder="••••••"
              />
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-xs text-gray-500 hover:underline">
                  Şifremi unuttum
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="font-semibold text-gray-900 hover:underline">
              Kayıt Ol
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            ← Mağazaya dön
          </Link>
        </p>
      </div>
    </main>
  );
}

const INPUT =
  "h-11 w-full rounded-lg border border-border bg-white px-4 text-sm transition placeholder:text-gray-400 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground";
