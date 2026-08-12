"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  ImageOff,
  PackageX,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL, authHeaders } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/catalog";
import { notify, parseApiError } from "@/lib/feedback";
import {
  getInvoiceTypeLabel,
  getOrderStatusInfo,
  getPaymentMethodLabel,
  type Order,
  type OrderStatusHistoryEntry,
  type ShipmentTracking,
} from "@/lib/order-status";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value,
  );

function orderDisplayNumber(order: Order) {
  if (order.orderNumber) return order.orderNumber;
  return `#${order.id.substring(0, 8).toUpperCase()}`;
}

function historyEntries(order: Order): OrderStatusHistoryEntry[] {
  const raw = order.statusHistory ?? order.history ?? [];
  return [...raw].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function OrderDetailView({ orderId }: { orderId: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnReason, setReturnReason] = useState("Other");
  const [returnDetail, setReturnDetail] = useState("");
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);

  const cancellable =
    order && ["Submitted", "Paid"].includes(order.orderStatus);
  const returnable =
    order && ["Paid", "Shipped", "Delivered"].includes(order.orderStatus);

  const handleCancel = async () => {
    if (!order || !confirm("Siparişi iptal etmek istediğinize emin misiniz?"))
      return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/cancel`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason: "Müşteri iptali" }),
      });
      if (res.ok) {
        setOrder({ ...order, orderStatus: "Cancelled" });
        notify.success("Sipariş iptal edildi.");
      } else {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "Sipariş iptal edilemedi."));
      }
    } catch {
      notify.error("İptal işlemi başarısız. Lütfen tekrar deneyin.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvoiceDownload = async () => {
    if (!order || !user) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/invoice.pdf`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "Fatura indirilemedi."));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fatura-${order.orderNumber || order.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("Fatura indirildi.");
    } catch {
      notify.error("Fatura indirme başarısız.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${order.id}/returns`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          reason: returnReason,
          reasonDetail: returnDetail || null,
          items: [],
        }),
      });
      if (res.ok) {
        notify.success(
          "İade talebiniz oluşturuldu. En kısa sürede incelenecek.",
        );
        router.push("/account/returns");
      } else {
        const raw = await res.text().catch(() => "");
        notify.error(parseApiError(raw, "İade talebi gönderilemedi."));
      }
    } catch {
      notify.error("İade talebi gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/detail/${orderId}`, {
          headers: authHeaders(),
        });

        if (res.ok) {
          const data: Order = await res.json();
          setOrder(data);
        } else if (res.status === 404 || res.status === 403) {
          setNotFound(true);
        } else {
          setNotFound(true);
          notify.error("Sipariş detayı yüklenemedi.");
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoadingData(false);
      }
    };

    fetchOrder();
  }, [user, isLoading, router, orderId]);

  useEffect(() => {
    if (!order?.trackingNumber) {
      setTracking(null);
      return;
    }

    let cancelled = false;
    const loadTracking = async () => {
      try {
        const res = await fetch(
          `${API_URL}/shipping/track/${encodeURIComponent(order.trackingNumber!)}`,
        );
        if (!res.ok || cancelled) return;
        const data: ShipmentTracking = await res.json();
        if (!cancelled) setTracking(data);
      } catch {
        // Takip bilgisi opsiyonel; sessizce yoksay
      }
    };

    loadTracking();
    return () => {
      cancelled = true;
    };
  }, [order?.trackingNumber]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">Sipariş detayı yükleniyor...</span>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
          <PackageX className="h-9 w-9 text-gray-400" strokeWidth={1.5} />
        </div>
        <h2 className="font-display mb-2 text-2xl font-bold">
          Sipariş bulunamadı
        </h2>
        <p className="mb-6 text-muted-foreground">
          Aradığınız sipariş mevcut değil.
        </p>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 font-medium text-white transition hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Siparişlerime dön
        </Link>
      </div>
    );
  }

  const statusInfo = getOrderStatusInfo(order.orderStatus);
  const isFailed =
    order.orderStatus === "Failed" || order.orderStatus === "StockFailed";
  const history = historyEntries(order);
  const paymentLabel = getPaymentMethodLabel(order.paymentMethod);
  const invoiceLabel = getInvoiceTypeLabel(order.invoiceType);
  const itemPrice = (item: Order["orderItems"][number]) =>
    item.price ?? item.unitPrice ?? 0;
  const total = order.totalPrice ?? order.totalAmount ?? 0;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Sipariş Detayı
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Sipariş No: {orderDisplayNumber(order)}
          </p>
          {order.trackingNumber && (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Takip No: {order.trackingNumber}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={handleInvoiceDownload}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-1.5 text-sm font-medium transition hover:bg-muted/50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Fatura indir
            </button>
          )}
          <span
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {order.trackingNumber && (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Kargo Takibi
                </h3>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {tracking?.statusName ||
                        getOrderStatusInfo(order.orderStatus).label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tracking?.carrierName
                        ? `${tracking.carrierName} · ${order.trackingNumber}`
                        : order.trackingNumber}
                    </p>
                  </div>
                </div>
                {tracking?.trackingUrl && (
                  <a
                    href={tracking.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Kargo firmasında takip et
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                Ürünler ({order.orderItems.length})
              </h3>
            </div>

            <div className="divide-y divide-border">
              {order.orderItems.map((item, index) => (
                <div key={item.id ?? index} className="flex items-center gap-4 p-5">
                  <Link
                    href={`/products/${item.productId}`}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition hover:opacity-80"
                  >
                    {item.pictureUrl ? (
                      <img
                        src={resolveMediaUrl(item.pictureUrl)}
                        className="h-full w-full object-cover"
                        alt={item.productName}
                      />
                    ) : (
                      <ImageOff className="h-7 w-7 text-gray-300" />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.productId}`}
                      className="line-clamp-2 text-sm font-medium text-foreground hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adet: {item.units}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">
                      {formatPrice(itemPrice(item) * item.units)}
                    </p>
                    {item.units > 1 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Birim: {formatPrice(itemPrice(item))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                Sipariş Özeti
              </h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sipariş Tarihi</span>
                <span className="font-medium">
                  {new Date(order.orderDate).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ürün Sayısı</span>
                <span className="font-medium">
                  {order.orderItems.reduce((sum, i) => sum + i.units, 0)} adet
                </span>
              </div>
              {typeof order.shippingCost === "number" &&
                order.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kargo</span>
                    <span className="font-medium">
                      {formatPrice(order.shippingCost)}
                    </span>
                  </div>
                )}
              {typeof order.discountAmount === "number" &&
                order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      İndirim
                      {order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span className="font-medium text-emerald-700">
                      -{formatPrice(order.discountAmount)}
                    </span>
                  </div>
                )}
              {paymentLabel && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ödeme</span>
                  <span className="font-medium">{paymentLabel}</span>
                </div>
              )}
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Toplam</span>
                  <span className="text-xl font-bold">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {(invoiceLabel ||
            order.companyName ||
            order.taxId ||
            order.taxOffice ||
            order.billingAddressLine) && (
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Fatura Bilgileri
                </h3>
              </div>
              <div className="space-y-2 p-5 text-sm">
                {invoiceLabel && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Fatura Tipi</span>
                    <span className="font-medium">{invoiceLabel}</span>
                  </div>
                )}
                {order.companyName && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Firma</span>
                    <span className="text-right font-medium">
                      {order.companyName}
                    </span>
                  </div>
                )}
                {order.taxId && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Vergi No</span>
                    <span className="font-medium">{order.taxId}</span>
                  </div>
                )}
                {order.taxOffice && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Vergi Dairesi</span>
                    <span className="text-right font-medium">
                      {order.taxOffice}
                    </span>
                  </div>
                )}
                {(order.billingAddressLine ||
                  (!order.billingSameAsShipping && order.addressLine)) && (
                  <div className="border-t border-border pt-2">
                    <p className="text-muted-foreground">Fatura Adresi</p>
                    <p className="mt-1 font-medium">
                      {order.billingSameAsShipping
                        ? [order.addressLine, order.city, order.zipCode]
                            .filter(Boolean)
                            .join(", ")
                        : [
                            order.billingAddressLine,
                            order.billingCity,
                            order.billingZipCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                Sipariş Durumu
              </h3>
            </div>
            <div className="space-y-4 p-5">
              {history.length > 0 ? (
                history.map((entry, index) => {
                  const info = getOrderStatusInfo(entry.status);
                  const isLast = index === history.length - 1;
                  return (
                    <div key={`${entry.status}-${entry.createdAt}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-white">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </div>
                        {!isLast && <div className="h-8 w-px bg-border" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium">{info.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {entry.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          ["Submitted", "Paid", "Shipped", "Delivered"].includes(
                            order.orderStatus,
                          )
                            ? "bg-foreground text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </div>
                      <div className="h-6 w-px bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Sipariş Alındı</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          ["Paid", "Shipped", "Delivered"].includes(
                            order.orderStatus,
                          )
                            ? "bg-foreground text-white"
                            : isFailed
                              ? "bg-red-500 text-white"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isFailed ? (
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="h-6 w-px bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {["Paid", "Shipped", "Delivered"].includes(
                          order.orderStatus,
                        )
                          ? "Ödeme Onaylandı"
                          : order.orderStatus === "Failed"
                            ? "İptal Edildi"
                            : order.orderStatus === "StockFailed"
                              ? "Stok Yetersiz"
                              : "Ödeme Bekleniyor"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          ["Shipped", "Delivered"].includes(order.orderStatus)
                            ? "bg-foreground text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Truck className="h-3 w-3" strokeWidth={2} />
                      </div>
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          ["Shipped", "Delivered"].includes(order.orderStatus)
                            ? ""
                            : "text-muted-foreground"
                        }`}
                      >
                        {order.orderStatus === "Delivered"
                          ? "Teslim Edildi"
                          : order.orderStatus === "Shipped"
                            ? "Kargoya Verildi"
                            : "Kargoya Verildi"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Link
            href="/account/orders"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Siparişlerime dön
          </Link>

          {cancellable && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Siparişi iptal et
            </button>
          )}

          {returnable && (
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold">İade talebi</h3>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="Damaged">Hasarlı ürün</option>
                <option value="WrongItem">Yanlış ürün</option>
                <option value="NotAsDescribed">Açıklamayla uyuşmuyor</option>
                <option value="ChangedMind">Fikir değişikliği</option>
                <option value="Defective">Arızalı</option>
                <option value="SizeIssue">Beden uymadı</option>
                <option value="LateDelivery">Geç teslimat</option>
                <option value="Other">Diğer</option>
              </select>
              <textarea
                value={returnDetail}
                onChange={(e) => setReturnDetail(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
                className="min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReturn}
                className="w-full rounded-xl border border-foreground py-3 text-sm font-medium disabled:opacity-50"
              >
                İade talebi oluştur
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
