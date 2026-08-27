import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import FooterSlot from "@/components/FooterSlot";
import SiteFooter from "@/components/SiteFooter";
import CookieBanner from "@/components/CookieBanner";
import AppToaster from "@/components/AppToaster";
import MobileBottomNav from "@/components/MobileBottomNav";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import AnnouncementBar from "@/components/AnnouncementBar";
import ScrollToTop from "@/components/ScrollToTop";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CartDrawerProvider } from "@/context/CartDrawerContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import {
  CURRENCY_META_COOKIE,
  parseCurrencyMeta,
  setCurrencyRuntime,
} from "@/lib/currency-runtime";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  preload: false,
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Yıldırım Store | Online Alışveriş",
      template: "%s | Yıldırım Store",
    },
    description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
    applicationName: "Yıldırım Store",
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: siteUrl,
      languages: {
        tr: siteUrl,
        en: siteUrl,
        "x-default": siteUrl,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "tr_TR",
      alternateLocale: locale === "en" ? ["tr_TR"] : ["en_US"],
      siteName: "Yıldırım Store",
      title: "Yıldırım Store | Online Alışveriş",
      description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: "Yıldırım Store | Online Alışveriş",
      description: "En yeni ürünler, en uygun fiyatlarla Yıldırım Store'da.",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  };
}

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Yıldırım Store",
  url: siteUrl,
  logo: `${siteUrl}/icon-512.png`,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Yıldırım Store",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/products?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("Header");
  const cookieStore = await cookies();
  const currencyMeta = parseCurrencyMeta(
    cookieStore.get(CURRENCY_META_COOKIE)?.value,
  );
  if (currencyMeta) setCurrencyRuntime(currencyMeta);

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${playfair.variable} flex min-h-screen flex-col antialiased selection:bg-foreground selection:text-white`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <CartProvider>
              <CartDrawerProvider>
                <FavoritesProvider>
                  <CurrencyProvider initialMeta={currencyMeta} uiLocale={locale}>
                    <ScrollToTop />
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
                    >
                      {t("skipToContent")}
                    </a>
                    <Suspense fallback={null}>
                      <AnnouncementBar />
                    </Suspense>
                    <div id="main-content" className="flex-1" tabIndex={-1}>
                      {children}
                    </div>
                    <FooterSlot>
                      <Suspense fallback={null}>
                        <SiteFooter />
                      </Suspense>
                    </FooterSlot>
                    <CookieBanner />
                    <AppToaster />
                    <MobileBottomNav />
                    <ServiceWorkerRegistrar />
                  </CurrencyProvider>
                </FavoritesProvider>
              </CartDrawerProvider>
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
