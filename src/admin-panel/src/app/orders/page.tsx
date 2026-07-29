"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, getOrders, updateOrderStatus } from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Ban } from "lucide-react";

/** Panelden elle atanabilecek durumlar. */
const ASSIGNABLE_STATUSES = ["Submitted", "Paid", "Shipped", "Delivered"];

/** Kargoya verilmemis siparisler iptal edilebilir. */
const CANCELLABLE = ["Submitted", "Paid"];

export default function OrdersPage() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.orderStatus !== statusFilter) return false;
      if (!term) return true;
      return (
        o.id.toLowerCase().includes(term) ||
        o.buyerId.toLowerCase().includes(term) ||
        `${o.firstName ?? ""} ${o.lastName ?? ""}`.toLowerCase().includes(term) ||
        (o.emailAddress ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, statusFilter, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success("Sipariş durumu güncellendi.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelOrder(id, reason),
    onSuccess: () => {
      toast.success("Sipariş iptal edildi.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sipariş Yönetimi</h1>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("")}
              className={`rounded-full px-3 py-1 text-sm border ${!statusFilter ? "bg-primary text-primary-foreground" : ""}`}
            >
              Tümü ({orders.length})
            </button>
            {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => {
              const count = orders.filter((o) => o.orderStatus === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full px-3 py-1 text-sm border ${statusFilter === key ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {val.label} ({count})
                </button>
              );
            })}
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sipariş no, müşteri adı veya e-posta ara"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş ID</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kalem</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const status = ORDER_STATUS_MAP[order.orderStatus] || {
                    label: order.orderStatus,
                    variant: "secondary" as const,
                  };
                  const customer =
                    `${order.firstName ?? ""} ${order.lastName ?? ""}`.trim() || order.buyerId;

                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-mono text-sm hover:underline">
                          {order.id.slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{customer}</p>
                        {order.emailAddress && (
                          <p className="text-xs text-muted-foreground">{order.emailAddress}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.totalAmount)}
                        {(order.discountAmount ?? 0) > 0 && (
                          <p className="text-xs text-green-600">
                            -{formatCurrency(order.discountAmount!)} indirim
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.orderItems?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <select
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                            value={
                              ASSIGNABLE_STATUSES.includes(order.orderStatus)
                                ? order.orderStatus
                                : ""
                            }
                            onChange={(e) =>
                              changeStatus.mutate({ id: order.id, status: e.target.value })
                            }
                          >
                            {!ASSIGNABLE_STATUSES.includes(order.orderStatus) && (
                              <option value="">{status.label}</option>
                            )}
                            {ASSIGNABLE_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {ORDER_STATUS_MAP[s]?.label ?? s}
                              </option>
                            ))}
                          </select>

                          {CANCELLABLE.includes(order.orderStatus) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Siparişi iptal et"
                              onClick={() => {
                                const reason = prompt("İptal nedeni (opsiyonel):") ?? "";
                                cancel.mutate({ id: order.id, reason });
                              }}
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Sipariş bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
