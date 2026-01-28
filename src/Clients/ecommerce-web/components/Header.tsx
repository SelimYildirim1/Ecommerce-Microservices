"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function Header() {
  // AuthContext'ten kullanıcı bilgisini ve çıkış fonksiyonunu çekiyoruz
  const { user, logout } = useAuth();
  // CartContext'ten sepet sayısını çekiyoruz
  const { cartCount } = useCart(); 

  return (
    <header className="p-4 border-b border-border bg-card sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary hover:opacity-90 transition">
          Yıldırım Store
        </Link>
        
        <nav className="flex items-center space-x-6">
          
          {/* DURUM 1: Kullanıcı Giriş Yapmışsa */}
          {user ? (
            <div className="flex items-center gap-4 border-r border-border pr-6">
              <div className="text-right hidden md:block">
                <span className="block text-xs text-muted-foreground">Hoşgeldin</span>
                <span className="block text-sm font-bold text-primary">{user.name}</span>
              </div>
              <button 
                onClick={logout}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition"
              >
                Çıkış
              </button>
            </div>
          ) : (
            /* DURUM 2: Kullanıcı Giriş Yapmamışsa (Misafir) */
            <div className="flex items-center gap-3 border-r border-border pr-6">
              <Link href="/login" className="text-sm font-medium hover:text-primary transition">
                Giriş Yap
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/register" className="text-sm font-medium hover:text-primary transition">
                Kayıt Ol
              </Link>
            </div>
          )}

          {/* Sepet Butonu (Herkes Görebilir) */}
          <Link href="/cart">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition flex items-center gap-2 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span>Sepetim ({cartCount})</span>
            </button>
          </Link>
          
        </nav>
      </div>
    </header>
  );
}