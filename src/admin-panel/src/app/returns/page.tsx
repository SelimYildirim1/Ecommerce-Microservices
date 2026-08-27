"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RETURN_STATUS_LABELS,
  approveReturn,
  getReturns,
  refundReturn,
  rejectReturn,
} from "@/lib/api";
import type { ReturnRequest, ReturnStatus } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, PackageCheck, RotateCcw, Wallet, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const STATUSES = Object.keys(RETURN_STATUS_LABELS) as ReturnStatus[];

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

const totalUnits = (request: ReturnRequest) =>
  request.items.reduce((sum, item) => sum + item.units, 0);

const STATUS_STYLES: Record<ReturnStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-blue-100 text-blue-700",
  Rejected: "bg-red-100 text-red-700",
  Refunded: "bg-green-100 text-green-700",
  Cancelled: "bg-muted text-muted-foreground",
};

type Action = "approve" | "reject" | "refund";

const ACTION_TITLES: Record<Action, string> = {
  approve: "İade Talebini Onayla",
  reject: "İade Talebini Reddet",
  refund: "Geri Ödemeyi Tamamla",
};

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReturnStatus | "">("");

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["returns", filter],
    queryFn: () => getReturns(filter || undefined),
  });

  const [dialog, setDialog] = useState<{
    action: Action;
    request: ReturnRequest;
    note: string;
    amount: number;
  } | null>(null);

  const resolve = useMutation({
    mutationFn: ({
      action,
      id,
      note,
      amount,
    }: {
      action: Action;
      id: string;
      note: string;
      amount: number;
    }) => {
      const payload = { adminNote: note.trim() || null, refundAmount: amount };
      if (action === "approve") return approveReturn(id, payload);
      if (action === "reject") return rejectReturn(id, payload);
      return refundReturn(id, payload);
    },
    onSuccess: (updated) => {
      toast.success(`Talep güncellendi: ${updated.statusName}`);
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const open = (action: Action, request: ReturnRequest) =>
    setDialog({
      action,
      request,
      note: request.adminNote ?? "",
      amount: request.refundAmount,
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">İade Yönetimi</h1>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as ReturnStatus | "")}
        >
          <option value="">Tüm durumlar</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {RETURN_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            İade Talepleri ({returns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talep No</TableHead>
                  <TableHead>Ürünler</TableHead>
                  <TableHead>Neden</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">
                      {request.requestNumber}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-0.5">
                        {request.items.map((item) => (
                          <p key={item.id} className="truncate text-sm">
                            {item.productName}
                            <span className="text-muted-foreground"> × {item.units}</span>
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{request.reasonName}</p>
                      {request.reasonDetail && (
                        <p className="text-xs text-muted-foreground">
                          {request.reasonDetail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {money(request.refundAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(request.requestedAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[request.status]}`}
                      >
                        {request.statusName}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {request.stockRestoredAt ? (
                        <span
                          className="inline-flex items-center gap-1 text-green-700"
                          title={`Stoğa eklendi: ${formatDate(request.stockRestoredAt)}`}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          {totalUnits(request)} adet eklendi
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {request.status === "Pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => open("approve", request)}
                            >
                              <Check className="mr-1 h-3 w-3" /> Onayla
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => open("reject", request)}
                            >
                              <X className="mr-1 h-3 w-3" /> Reddet
                            </Button>
                          </>
                        )}
                        {request.status === "Approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => open("refund", request)}
                          >
                            <Wallet className="mr-1 h-3 w-3" /> Geri Ödeme
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      İade talebi yok
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog ? ACTION_TITLES[dialog.action] : ""}</DialogTitle>
          </DialogHeader>

          {dialog && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-mono text-xs text-muted-foreground">
                  {dialog.request.requestNumber}
                </p>
                <p className="mt-1">{dialog.request.reasonName}</p>
                {dialog.request.reasonDetail && (
                  <p className="text-muted-foreground">{dialog.request.reasonDetail}</p>
                )}
              </div>

              {dialog.action === "approve" && !dialog.request.stockRestoredAt && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Onayladığınızda toplam{" "}
                    <strong>{totalUnits(dialog.request)} adet</strong> ilgili ürün
                    varyantlarının stoğuna otomatik eklenecek.
                  </p>
                </div>
              )}

              {dialog.action !== "reject" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">İade Tutarı (₺)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={dialog.amount}
                    onChange={(e) =>
                      setDialog({ ...dialog, amount: Number(e.target.value) })
                    }
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Yönetici Notu</Label>
                <Textarea
                  rows={3}
                  value={dialog.note}
                  onChange={(e) => setDialog({ ...dialog, note: e.target.value })}
                  placeholder={
                    dialog.action === "reject"
                      ? "Red gerekçesini yazın"
                      : "Müşteriye iletilecek not"
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Vazgeç
            </Button>
            <Button
              disabled={resolve.isPending}
              onClick={() =>
                dialog &&
                resolve.mutate({
                  action: dialog.action,
                  id: dialog.request.id,
                  note: dialog.note,
                  amount: dialog.amount,
                })
              }
            >
              {resolve.isPending ? "İşleniyor..." : "Onayla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
