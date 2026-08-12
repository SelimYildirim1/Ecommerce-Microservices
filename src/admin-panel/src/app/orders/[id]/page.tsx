"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  downloadOrderInvoice,
  getOrderDetail,
  updateOrderAdminNote,
  updateOrderStatus,
} from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

const STATUS_FLOW = ["Submitted", "Paid", "Shipped", "Delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderDetail(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (order) setAdminNote(order.adminNote ?? "");
  }, [order]);

  const mutation = useMutation({
    mutationFn: ({
      status,
      trackingNumber: tn,
    }: {
      status: string;
      trackingNumber?: string;
    }) => updateOrderStatus(id, status, tn),
    onSuccess: () => {
      toast.success("Sipariş durumu güncellendi!");
      setTrackingNumber("");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const noteMutation = useMutation({
    mutationFn: () => updateOrderAdminNote(id, adminNote.trim() || null),
    onSuccess: () => {
      toast.success("Admin notu kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleInvoiceDownload = async () => {
    try {
      const blob = await downloadOrderInvoice(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order?.orderNumber || id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fatura indirildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fatura indirilemedi");
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  if (!order) return <p className="text-destructive">Sipariş bulunamadı.</p>;

  const currentStatus = ORDER_STATUS_MAP[order.orderStatus] || {
    label: order.orderStatus,
    variant: "secondary" as const,
  };

  const currentIndex = STATUS_FLOW.indexOf(order.orderStatus);
  const nextStatus = currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIndex + 1]
    : null;

  const handleAdvance = () => {
    if (!nextStatus) return;
    mutation.mutate({
      status: nextStatus,
      trackingNumber:
        nextStatus === "Shipped" ? trackingNumber.trim() || undefined : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Sipariş Detayı</h1>
        <Badge variant={currentStatus.variant} className="text-base px-3 py-1">
          {currentStatus.label}
        </Badge>
        <Button variant="outline" className="ml-auto" onClick={handleInvoiceDownload}>
          <Download className="mr-2 h-4 w-4" />
          Fatura PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Sipariş Kalemleri</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Özellikler</TableHead>
                  <TableHead>Birim Fiyat</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.orderItems?.map((item, i) => (
                  <TableRow key={item.id ?? i}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.selectedAttributes || "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>{item.units}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.unitPrice * item.units)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Bilgiler</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.orderNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sipariş No</span>
                  <span className="font-mono">{order.orderNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sipariş ID</span>
                <span className="font-mono">{order.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Müşteri</span>
                <span>{order.buyerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarih</span>
                <span>{formatDate(order.orderDate)}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Takip No</span>
                  <span className="font-mono">{order.trackingNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam</span>
                <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.description && (
                <div>
                  <span className="text-muted-foreground">Sipariş Notu:</span>
                  <p className="mt-1">{order.description}</p>
                </div>
              )}
              {order.giftWrap && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="font-medium text-sm flex items-center gap-1.5">🎁 Hediye Paketi</p>
                  {order.giftMessage && <p className="text-sm text-muted-foreground">{order.giftMessage}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Admin Notu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="İç not (müşteriye görünmez)"
                rows={4}
              />
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => noteMutation.mutate()}
                disabled={noteMutation.isPending}
              >
                {noteMutation.isPending ? "Kaydediliyor..." : "Notu Kaydet"}
              </Button>
            </CardContent>
          </Card>

          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Durum Geçmişi</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.statusHistory.map((h, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-foreground" />
                        {idx < order.statusHistory!.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium">{ORDER_STATUS_MAP[h.status]?.label || h.status}</p>
                        {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Durum Güncelle</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {STATUS_FLOW.map((s, i) => {
                  const si = STATUS_FLOW.indexOf(order.orderStatus);
                  const isDone = i <= si;
                  const isCurrent = s === order.orderStatus;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${isDone ? "bg-green-500" : "bg-muted"} ${isCurrent ? "ring-2 ring-green-300" : ""}`} />
                      <span className={`text-sm ${isCurrent ? "font-bold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                        {ORDER_STATUS_MAP[s]?.label || s}
                      </span>
                    </div>
                  );
                })}
              </div>

              {nextStatus === "Shipped" && (
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground" htmlFor="trackingNumber">
                    Takip numarası (opsiyonel)
                  </label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Kargo takip no"
                  />
                </div>
              )}

              {nextStatus && (
                <Button
                  className="w-full"
                  onClick={handleAdvance}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Güncelleniyor..." : `→ ${ORDER_STATUS_MAP[nextStatus]?.label || nextStatus}`}
                </Button>
              )}

              {order.orderStatus !== "Cancelled" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => mutation.mutate({ status: "Cancelled" })}
                  disabled={mutation.isPending}
                >
                  İptal Et
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
