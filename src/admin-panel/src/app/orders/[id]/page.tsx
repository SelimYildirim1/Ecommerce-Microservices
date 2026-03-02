"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrderDetail, updateOrderStatus } from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

const STATUS_FLOW = ["Submitted", "Paid", "Shipped", "Delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderDetail(id),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success("Sipariş durumu güncellendi!");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-3xl font-bold">Sipariş Detayı</h1>
        <Badge variant={currentStatus.variant} className="text-base px-3 py-1">
          {currentStatus.label}
        </Badge>
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
                  <TableRow key={i}>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam</span>
                <span className="font-bold text-lg">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.description && (
                <div>
                  <span className="text-muted-foreground">Not:</span>
                  <p className="mt-1">{order.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Durum Güncelle</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {/* Status timeline */}
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

              {nextStatus && (
                <Button
                  className="w-full"
                  onClick={() => mutation.mutate(nextStatus)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Güncelleniyor..." : `→ ${ORDER_STATUS_MAP[nextStatus]?.label || nextStatus}`}
                </Button>
              )}

              {order.orderStatus !== "Cancelled" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => mutation.mutate("Cancelled")}
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
