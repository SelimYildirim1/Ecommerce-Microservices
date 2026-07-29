import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted-foreground">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
      <Link href="/" className="rounded-lg bg-foreground px-5 py-2.5 text-sm text-white">
        Anasayfaya dön
      </Link>
    </main>
  );
}
