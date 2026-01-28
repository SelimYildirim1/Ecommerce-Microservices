"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      alert("Şifreler eşleşmiyor!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/register", {
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
        alert("🎉 Kayıt Başarılı! Giriş yapabilirsiniz.");
        router.push("/login");
      } else {
        const data = await res.json().catch(() => ({}));
        const errors = data?.errors;
        const message = errors
          ? Object.entries(errors).flatMap(([k, v]) => (Array.isArray(v) ? v : [v])).join("\n")
          : data?.title || data?.detail || "Kayıt başarısız.";
        alert("Kayıt başarısız:\n" + message);
      }
    } catch (error) {
      console.error(error);
      alert("Bağlantı hatası!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="w-full max-w-md p-8 bg-card border border-border rounded-lg shadow-lg">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Aramıza Katılın</h1>
          <p className="text-muted-foreground mt-2">Saniyeler içinde hesap oluşturun</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ad</label>
              <input 
                name="firstName"
                required
                onChange={handleChange}
                value={formData.firstName}
                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="Adınız"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Soyad</label>
              <input 
                name="lastName"
                required
                onChange={handleChange}
                value={formData.lastName}
                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                placeholder="Soyadınız"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kullanıcı Adı</label>
            <input 
              name="userName"
              required
              onChange={handleChange}
              value={formData.userName}
              className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
              placeholder="kullaniciadi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-Posta</label>
            <input 
              name="email"
              type="email" 
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
              placeholder="mail@ornek.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Şifre</label>
              <input 
                name="password"
                type="password" 
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Şifre Tekrar</label>
              <input 
                name="confirmPassword"
                type="password" 
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Giriş Yap
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}