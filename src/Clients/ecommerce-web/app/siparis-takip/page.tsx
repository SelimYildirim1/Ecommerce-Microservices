"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { ChevronRight, Search } from "lucide-react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";
import { getOrderStatusInfo } from "@/lib/order-status";

interface TrackItem {
  productName: string;
  pictureUrl?: string | null;
  unitPrice: number;
  units: number;
}

interface TrackResult {
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  totalAmount: number;
  trackingNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  paymentMethod?: string | null;
  items: TrackItem[];
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

function TrackForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get("email") ?? "";
    const qOrder = searchParams.get("orderNumber") ?? "";
    if (qEmail) setEmail(qEmail);
    if (qOrder) setOrderNumber(qOrder);
  }, [searchParams]);

  const track = async (emailValue: string, orderValue: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/orders/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue.trim(),
          orderNumber: orderValue.trim(),
        }),
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "Sipariş bulunamadı. Bilgileri kontrol edin."));
        return;
      }

      const data = (await res.json()) as TrackResult;
      setResult({
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch {
      notify.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoTried) return;
    const qEmail = searchParams.get("email");
    const qOrder = searchParams.get("orderNumber");
    if (qEmail && qOrder) {
      setAutoTried(true);
      void track(qEmail, qOrder);
    }
  }, [searchParams, autoTried]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !orderNumber.trim()) {
      notify.error("E-posta ve sipariş numarası zorunludur.");
      return;
    }
    void track(email, orderNumber);
  };

  const inputClass =
    "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";
  const labelClass =
    "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

  const status = result ? getOrderStatusInfo(result.orderStatus) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border p-6"
      >
        <div>
          <label className={labelClass}>E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Siparişte kullandığınız e-posta"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sipariş Numarası</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Örn. YS-250807-1234"
            required
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          <Search className="h-4 w-4" strokeWidth={1.5} />
          {loading ? "Sorgulanıyor..." : "Siparişi Sorgula"}
        </button>
      </form>

      {result && status && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sipariş
                </p>
                <p className="mt-1 font-mono text-xl font-bold">{result.orderNumber}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(result.orderDate)}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${status.color}`}
              >
                {status.label}
              </span>
            </div>

            {result.trackingNumber && (
              <p className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-sm">
                Kargo takip no:{" "}
                <span className="font-mono font-medium">{result.trackingNumber}</span>
              </p>
            )}

            {(result.addressLine || result.city) && (
              <p className="mt-4 text-sm text-muted-foreground">
                Teslimat:{" "}
                {[result.addressLine, result.state, result.city, result.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider">Ürünler</h2>
            </div>
            <ul className="divide-y divide-border">
              {result.items.map((item, idx) => (
                <li
                  key={`${item.productName}-${idx}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 text-sm"
                >
                  <span>
                    <span className="font-medium">{item.productName}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {item.units} adet × {formatPrice(item.unitPrice)}
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.unitPrice * item.units)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border px-5 py-4 text-sm font-semibold">
              <span>Toplam</span>
              <span>{formatPrice(result.totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackPage() {
  return (
    <main className="bg-white text-gray-900">
      <Header />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Anasayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Sipariş Takip</span>
        </nav>

        <h1 className="font-display mb-2 text-3xl font-bold md:text-4xl">Sipariş Takip</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Sipariş numaranız ve e-posta adresinizle durumunu sorgulayın.
        </p>

        <Suspense
          fallback={
            <div className="py-12 text-center text-sm text-muted-foreground">Yükleniyor…</div>
          }
        >
          <TrackForm />
        </Suspense>
      </div>
    </main>
  );
}
