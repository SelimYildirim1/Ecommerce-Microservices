"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter((o) => o.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sipariş Yönetimi</h1>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const status = ORDER_STATUS_MAP[order.orderStatus] || {
                    label: order.orderStatus,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="font-mono text-sm hover:underline">
                          {order.id.slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>{order.buyerId}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.orderItems?.length || 0}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
