import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çevrimdışı",
  description: "İnternet bağlantısı yok.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Çevrimdışısınız</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        İnternet bağlantınız yok gibi görünüyor. Bağlantı geldiğinde mağazaya
        dönebilirsiniz.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm text-white"
      >
        Anasayfaya dön
      </Link>
    </main>
  );
}
