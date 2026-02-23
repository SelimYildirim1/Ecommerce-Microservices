"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("selimyildirim@mail.com");
  const [password, setPassword] = useState("123456");

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
        alert("Giris basarisiz! Bilgileri kontrol edin.");
      }
    } catch (error) {
      console.error(error);
      alert("Baglanti hatasi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">YS</span>
            </div>
          </Link>
        </div>

        <div className="border border-border rounded-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Tekrar Hosgeldiniz</h1>
            <p className="text-muted-foreground text-sm mt-2">Hesabiniza giris yapin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                E-Posta Adresi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition"
                placeholder="ornek@mail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Sifre
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-foreground text-white font-medium rounded-lg hover:bg-foreground/85 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giris Yapiliyor...
                </>
              ) : (
                "Giris Yap"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Hesabiniz yok mu?{" "}
              <Link href="/register" className="text-foreground font-semibold hover:underline">
                Kayit Ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
