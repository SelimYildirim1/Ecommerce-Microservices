"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStockAlerts, notifyStockAlert } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function StockAlertsPage() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: () => getStockAlerts(true),
  });

  const notifyMutation = useMutation({
    mutationFn: notifyStockAlert,
    onSuccess: (r) => {
      toast.success(`Bildirim gönderildi: ${r.email}`);
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bekleyen Stok Bildirimleri</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : alerts.length === 0 ? (
        <p className="text-muted-foreground">Bekleyen bildirim yok.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="font-medium">{a.productName ?? "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {a.productId}
                  </div>
                </TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.userId ?? "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(a.createdAt).toLocaleString("tr-TR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={notifyMutation.isPending}
                    onClick={() => notifyMutation.mutate(a.id)}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Bildir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
