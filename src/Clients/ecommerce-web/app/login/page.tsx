"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Router import edildi
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth(); // Context'ten login fonksiyonunu al
  const router = useRouter();  // <--- EKSİK OLAN KISIM BURASIYDI (Tanımladık)
  const [loading, setLoading] = useState(false);
  
  // Form Verileri
  const [email, setEmail] = useState("selimyildirim@mail.com");
  const [password, setPassword] = useState("123456");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // ÖNEMLİ: Token'ı Context'e gönderiyoruz. 
        // Cookie kaydını ve yönlendirmeyi (router.push) AuthContext içindeki login fonksiyonu yapacak.
        login(data.token); 
        
      } else {
        alert("❌ Giriş başarısız! Bilgileri kontrol edin.");
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
          <h1 className="text-3xl font-bold text-primary">Tekrar Hoşgeldiniz</h1>
          <p className="text-muted-foreground mt-2">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-Posta Adresi</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Şifre</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Hemen Kayıt Ol
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}