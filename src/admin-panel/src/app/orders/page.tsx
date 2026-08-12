"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelOrder,
  exportOrdersCsv,
  getOrders,
  updateOrderStatus,
  type PagedOrders,
} from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { Ban, Download, Plus } from "lucide-react";

/** Panelden elle atanabilecek durumlar. */
const ASSIGNABLE_STATUSES = ["Submitted", "Paid", "Shipped", "Delivered"];

/** Kargoya verilmemis siparisler iptal edilebilir. */
const CANCELLABLE = ["Submitted", "Paid"];

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = {
    from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
    to: toDate ? `${toDate}T00:00:00.000Z` : undefined,
    status: statusFilter || undefined,
    search: searchApplied || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["orders", queryParams],
    queryFn: () => getOrders(queryParams) as Promise<PagedOrders>,
  });

  const orders = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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

  const applySearch = () => {
    setPage(1);
    setSearchApplied(search.trim());
  };

  const downloadCsv = async () => {
    try {
      const blob = await exportOrdersCsv({
        from: queryParams.from,
        to: queryParams.to,
        status: queryParams.status,
        search: queryParams.search,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV indirildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CSV indirilemedi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Sipariş Yönetimi</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            CSV dışa aktar
          </Button>
          <Link href="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Manuel sipariş
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-medium text-muted-foreground">
            Toplam {totalCount} sipariş
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setStatusFilter(""); setPage(1); }}
              className={`rounded-full px-3 py-1 text-sm border ${!statusFilter ? "bg-primary text-primary-foreground" : ""}`}
            >
              Tümü
            </button>
            {Object.entries(ORDER_STATUS_MAP).map(([key, val]) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(key); setPage(1); }}
                className={`rounded-full px-3 py-1 text-sm border ${statusFilter === key ? "bg-primary text-primary-foreground" : ""}`}
              >
                {val.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Başlangıç</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Bitiş</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="w-40"
              />
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Sipariş no, müşteri veya e-posta"
              className="max-w-sm"
            />
            <Button variant="secondary" onClick={applySearch}>Ara</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Kalem</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
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
                            {order.orderNumber || `${order.id.slice(0, 8)}...`}
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
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Sipariş bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Sayfa {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
