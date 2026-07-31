"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      notify.error("Şifreler eşleşmiyor. Lütfen kontrol edin.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: formData.userName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.requiresEmailConfirmation) {
          notify.success(
            data.message ||
              "Kayıt başarılı. Giriş yapmadan önce e-posta adresinizi doğrulayın.",
          );
          router.push("/login");
          return;
        }
        notify.success("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        router.push("/login");
      } else {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "Kayıt tamamlanamadı. Bilgileri kontrol edin."));
      }
    } catch (error) {
      console.error(error);
      notify.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-lg border border-border bg-white px-4 text-sm transition placeholder:text-gray-400 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground";
  const labelClass =
    "mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500";

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
            <h1 className="font-display text-3xl font-bold text-gray-900">Hesap oluşturun</h1>
            <p className="mt-2 text-sm text-gray-500">Saniyeler içinde kayıt olun</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ad</label>
                <input
                  name="firstName"
                  required
                  onChange={handleChange}
                  value={formData.firstName}
                  className={inputClass}
                  placeholder="Adınız"
                />
              </div>
              <div>
                <label className={labelClass}>Soyad</label>
                <input
                  name="lastName"
                  required
                  onChange={handleChange}
                  value={formData.lastName}
                  className={inputClass}
                  placeholder="Soyadınız"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Kullanıcı adı</label>
              <input
                name="userName"
                required
                onChange={handleChange}
                value={formData.userName}
                className={inputClass}
                placeholder="kullaniciadi"
              />
            </div>

            <div>
              <label className={labelClass}>E-posta</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="mail@ornek.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Şifre</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Şifre tekrar</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={inputClass}
                />
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
                  Kaydediliyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="font-semibold text-gray-900 hover:underline">
              Giriş Yap
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
