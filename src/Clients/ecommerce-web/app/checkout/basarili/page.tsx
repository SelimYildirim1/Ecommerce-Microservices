"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { CheckCircle2, ChevronRight, Package } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") ?? "";
  const email = searchParams.get("email") ?? "";
  const payment = searchParams.get("payment") ?? "card";

  const trackHref =
    orderNumber || email
      ? `/siparis-takip?${new URLSearchParams({
          ...(orderNumber ? { orderNumber } : {}),
          ...(email ? { email } : {}),
        }).toString()}`
      : "/siparis-takip";

  return (
    <>
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-9 w-9" strokeWidth={1.5} />
        </div>

        <h1 className="font-display text-3xl font-bold md:text-4xl">Teşekkürler!</h1>
        <p className="mt-3 text-muted-foreground">
          Siparişiniz alındı. Onay e-postası{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "adresinize"
          )}{" "}
          gönderilecektir.
        </p>

        {orderNumber && (
          <div className="mt-8 rounded-2xl border border-border bg-muted/30 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sipariş Numarası
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-wide">{orderNumber}</p>
          </div>
        )}

        {payment === "bank_transfer" && (
          <div className="mt-6 rounded-2xl border border-border p-5 text-left text-sm space-y-2">
            <p className="font-semibold">Havale / EFT bilgileri</p>
            <p>
              IBAN: <span className="font-mono">TR00 0000 0000 0000 0000 0000 00</span>
            </p>
            <p>Alıcı: Yıldırım Store</p>
            <p className="text-muted-foreground">
              Açıklamaya sipariş numaranızı yazın
              {orderNumber ? (
                <>
                  : <span className="font-mono text-foreground">{orderNumber}</span>
                </>
              ) : (
                "."
              )}
            </p>
          </div>
        )}

        {payment === "cash_on_delivery" && (
          <p className="mt-6 rounded-2xl border border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
            Kapıda ödeme seçtiniz. Kargo firması teslimatta ek ücret talep edebilir.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={trackHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Package className="h-4 w-4" strokeWidth={1.5} />
            Siparişimi Takip Et
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium transition hover:border-foreground"
          >
            Alışverişe Devam
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium transition hover:border-foreground"
          >
            Anasayfa
          </Link>
        </div>
      </div>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="bg-white text-gray-900">
      <Header />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <nav className="mb-8 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Sipariş Alındı</span>
        </nav>

        <Suspense
          fallback={
            <div className="py-20 text-center text-sm text-muted-foreground">Yükleniyor…</div>
          }
        >
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  );
}
