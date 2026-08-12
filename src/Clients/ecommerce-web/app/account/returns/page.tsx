"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL, authHeaders } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";
import type { ReturnRequest, ReturnStatus } from "@/lib/order-status";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value,
  );

const STATUS_COLOR: Record<ReturnStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  Approved: "bg-blue-50 text-blue-700 border-blue-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Refunded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function AccountReturnsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadReturns = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `${API_URL}/orders/returns/buyer/${user.id}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        setReturns(await res.json());
      } else {
        notify.error("İade talepleri yüklenemedi.");
      }
    } catch {
      notify.error("Sunucuya bağlanılamadı.");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadReturns();
  }, [user, isLoading, router, loadReturns]);

  const handleCancel = async (id: string) => {
    if (!confirm("İade talebini iptal etmek istediğinize emin misiniz?")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`${API_URL}/orders/returns/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
      });
      if (res.ok) {
        const updated: ReturnRequest = await res.json();
        setReturns((prev) =>
          prev.map((r) => (r.id === id ? updated : r)),
        );
        notify.success("İade talebi iptal edildi.");
      } else {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "İade talebi iptal edilemedi."));
      }
    } catch {
      notify.error("İptal işlemi başarısız.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">İade talepleri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold md:text-3xl">
          İade Taleplerim
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Açtığınız iade taleplerini buradan takip edebilirsiniz.
        </p>
      </div>

      {returns.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
            <RotateCcw className="h-9 w-9 text-gray-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-display mb-2 text-xl font-bold">
            Henüz iade talebiniz yok
          </h3>
          <p className="mb-6 text-muted-foreground">
            Sipariş detayından uygun siparişler için iade talebi oluşturabilirsiniz.
          </p>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 font-medium text-white transition hover:bg-gray-800"
          >
            <Package className="h-4 w-4" />
            Siparişlerime git
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-gray-100"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4">
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {item.requestNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(item.requestedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    {item.reasonName}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    STATUS_COLOR[item.status] ?? STATUS_COLOR.Pending
                  }`}
                >
                  {item.statusName || item.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">İade tutarı: </span>
                    <span className="font-semibold">
                      {formatPrice(item.refundAmount)}
                    </span>
                  </p>
                  {item.reasonDetail && (
                    <p className="text-muted-foreground">{item.reasonDetail}</p>
                  )}
                  {item.adminNote && (
                    <p className="text-xs text-muted-foreground">
                      Not: {item.adminNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/account/orders/${item.orderId}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                  >
                    Siparişi gör
                  </Link>
                  {item.status === "Pending" && (
                    <button
                      type="button"
                      disabled={cancellingId === item.id}
                      onClick={() => handleCancel(item.id)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {cancellingId === item.id ? "İptal ediliyor..." : "İptal et"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
