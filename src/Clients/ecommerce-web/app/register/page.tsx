"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Sifreler eslemiyor!");
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
          password: formData.password
        }),
      });

      if (res.ok) {
        alert("Kayit basarili! Giris yapabilirsiniz.");
        router.push("/login");
      } else {
        const data = await res.json().catch(() => ({}));
        const errors = data?.errors;
        const message = errors
          ? Object.entries(errors).flatMap(([k, v]) => (Array.isArray(v) ? v : [v])).join("\n")
          : data?.title || data?.detail || "Kayit basarisiz.";
        alert("Kayit basarisiz:\n" + message);
      }
    } catch (error) {
      console.error(error);
      alert("Baglanti hatasi!");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";
  const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
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
            <h1 className="text-2xl font-bold text-foreground">Hesap Olusturun</h1>
            <p className="text-muted-foreground text-sm mt-2">Saniyeler icinde kayit olun</p>
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
                  placeholder="Adiniz"
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
                  placeholder="Soyadiniz"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Kullanici Adi</label>
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
              <label className={labelClass}>E-Posta</label>
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
                <label className={labelClass}>Sifre</label>
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
                <label className={labelClass}>Sifre Tekrar</label>
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
              className="w-full h-11 bg-foreground text-white font-medium rounded-lg hover:bg-foreground/85 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                "Kayit Ol"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Zaten hesabiniz var mi?{" "}
              <Link href="/login" className="text-foreground font-semibold hover:underline">
                Giris Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
