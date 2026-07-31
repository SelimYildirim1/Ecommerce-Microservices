import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import FooterSlot from "@/components/FooterSlot";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import AppToaster from "@/components/AppToaster";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yıldırım Store | Online Alışveriş",
  description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${inter.variable} ${playfair.variable} flex min-h-screen flex-col antialiased selection:bg-foreground selection:text-white`}
      >
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <div className="flex-1">{children}</div>
              <FooterSlot>
                <Suspense fallback={null}>
                  <SiteFooter />
                </Suspense>
              </FooterSlot>
              <CookieBanner />
              <AppToaster />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
