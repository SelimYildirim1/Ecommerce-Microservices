"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getOrders, type Order } from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, ShoppingCart, Package, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type RangePreset = 7 | 30 | 90 | "custom";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDayIso(dateStr: string) {
  return `${dateStr}T00:00:00.000Z`;
}

function endOfDayIso(dateStr: string) {
  return `${dateStr}T23:59:59.999Z`;
}

function buildDailySales(orders: Order[], fromDate: string, toDate: string) {
  const from = new Date(startOfDayIso(fromDate));
  const to = new Date(endOfDayIso(toDate));
  const days: { date: string; totalSales: number; orderCount: number }[] = [];

  for (let cursor = new Date(from); cursor <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => o.orderDate.slice(0, 10) === key);
    days.push({
      date: key,
      totalSales: dayOrders
        .filter((o) => o.orderStatus === "Paid")
        .reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: dayOrders.length,
    });
  }

  return days;
}

export default function DashboardPage() {
  const today = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<RangePreset>(7);
  const [customFrom, setCustomFrom] = useState(() =>
    toDateInputValue(new Date(Date.now() - 6 * 86400000))
  );
  const [customTo, setCustomTo] = useState(() => toDateInputValue(today));

  const range = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom || toDateInputValue(new Date(Date.now() - 6 * 86400000)),
        to: customTo || toDateInputValue(today),
      };
    }
    const to = today;
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - (preset - 1));
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }, [preset, customFrom, customTo, today]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardSummary,
  });

  const { data: rangeOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["dashboard-orders", range.from, range.to],
    queryFn: () =>
      getOrders({
        from: startOfDayIso(range.from),
        to: endOfDayIso(range.to),
      }) as Promise<Order[]>,
  });

  const dailySales = useMemo(
    () => buildDailySales(rangeOrders, range.from, range.to),
    [rangeOrders, range.from, range.to]
  );

  const periodSales = useMemo(
    () =>
      rangeOrders
        .filter((o) => o.orderStatus === "Paid")
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [rangeOrders]
  );

  const periodActiveOrders = useMemo(
    () => rangeOrders.filter((o) => o.orderStatus === "Submitted" || o.orderStatus === "Paid").length,
    [rangeOrders]
  );

  const recentInRange = useMemo(
    () =>
      [...rangeOrders]
        .sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate))
        .slice(0, 5),
    [rangeOrders]
  );

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <p className="text-destructive">Hata: {(error as Error).message}</p>;
  if (!data) return null;

  const chartTitle =
    preset === "custom"
      ? `${range.from} – ${range.to} Satış Grafiği`
      : `Son ${preset} Günlük Satış Grafiği`;

  const stats = [
    {
      title: "Dönem Satışı",
      value: formatCurrency(periodSales),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Dönem Aktif Sipariş",
      value: periodActiveOrders,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "Toplam Ürün",
      value: data.totalProducts,
      icon: Package,
      color: "text-purple-600",
    },
    {
      title: "Toplam Üye",
      value: data.newUsers,
      icon: Users,
      color: "text-orange-600",
    },
  ];

  const presets: { key: RangePreset; label: string }[] = [
    { key: 7, label: "7 gün" },
    { key: 30, label: "30 gün" },
    { key: 90, label: "90 gün" },
    { key: "custom", label: "Özel" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-end gap-2">
          {presets.map((p) => (
            <Button
              key={String(p.key)}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
          {preset === "custom" ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Başlangıç</label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Bitiş</label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ordersLoading && String(stat.title).startsWith("Dönem")
                  ? "…"
                  : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Grafik yükleniyor…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Tarih: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  name="Satış"
                />
                <Line
                  type="monotone"
                  dataKey="orderCount"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  name="Sipariş Sayısı"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Siparişler (dönem)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInRange.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Bu dönemde sipariş yok
                    </TableCell>
                  </TableRow>
                ) : (
                  recentInRange.map((order) => {
                    const status = ORDER_STATUS_MAP[order.orderStatus] || {
                      label: order.orderStatus,
                      variant: "secondary" as const,
                    };
                    const customer =
                      `${order.firstName ?? ""} ${order.lastName ?? ""}`.trim() ||
                      order.emailAddress ||
                      order.buyerId;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{customer}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Stok Alarmı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Stok alarmı yok
                    </TableCell>
                  </TableRow>
                ) : (
                  data.lowStockProducts.flatMap((p) =>
                    p.variants.map((v) => (
                      <TableRow key={v.variantId}>
                        <TableCell className="font-medium">{p.productName}</TableCell>
                        <TableCell className="text-sm">{v.sku}</TableCell>
                        <TableCell>
                          <Badge variant={v.stockQuantity <= 3 ? "destructive" : "secondary"}>
                            {v.stockQuantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
