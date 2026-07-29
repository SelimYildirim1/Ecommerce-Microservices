"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  STOCK_MOVEMENT_LABELS,
  adjustStock,
  getStockMovements,
  getStockSummary,
} from "@/lib/api";
import type { StockLine, StockMovementType } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Boxes, PackageX, Warehouse } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const MOVEMENT_TYPES = Object.keys(STOCK_MOVEMENT_LABELS) as StockMovementType[];

/** Manuel hareket olarak secilebilecek turler; satis otomatik islenir. */
const MANUAL_TYPES: StockMovementType[] = ["In", "Out", "Adjustment", "Return"];

const LOW_STOCK_THRESHOLD = 10;

interface AdjustDraft {
  line: StockLine;
  type: StockMovementType;
  quantity: number;
  note: string;
}

export default function StockPage() {
  const queryClient = useQueryClient();

  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StockMovementType | "">("");
  const [draft, setDraft] = useState<AdjustDraft | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["stock-summary", lowStockOnly],
    queryFn: () => getStockSummary(lowStockOnly),
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", typeFilter],
    queryFn: () => getStockMovements({ type: typeFilter || undefined, take: 200 }),
  });

  const adjust = useMutation({
    mutationFn: (payload: AdjustDraft) =>
      adjustStock({
        variantId: payload.line.variantId,
        quantity: payload.quantity,
        type: payload.type,
        note: payload.note || null,
      }),
    onSuccess: () => {
      toast.success("Stok güncellendi.");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["stock-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const term = search.trim().toLocaleLowerCase("tr-TR");

  const lines = (summary?.lines ?? []).filter(
    (line) =>
      !term ||
      line.productName.toLocaleLowerCase("tr-TR").includes(term) ||
      line.sku.toLocaleLowerCase("tr-TR").includes(term)
  );

  const stats = [
    {
      title: "Toplam varyant",
      value: summary?.totalVariants ?? 0,
      icon: Boxes,
      color: "text-blue-600",
    },
    {
      title: "Stoğu biten",
      value: summary?.outOfStockCount ?? 0,
      icon: PackageX,
      color: "text-red-600",
    },
    {
      title: "Kritik stok",
      value: summary?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      title: "Stok değeri",
      value: formatCurrency(summary?.stockValue ?? 0),
      icon: Warehouse,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stok Yönetimi</h1>
        <p className="text-sm text-muted-foreground">
          Güncel stok tablosu ve tüm giriş/çıkış hareketleri.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="levels">
        <TabsList>
          <TabsTrigger value="levels">Stok durumu</TabsTrigger>
          <TabsTrigger value="movements">Hareket geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>{lines.length} varyant</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Ürün adı veya SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56"
                />
                <Button
                  variant={lowStockOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLowStockOnly((v) => !v)}
                >
                  Sadece kritik stok
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
              ) : lines.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">
                  Bu filtrede varyant bulunmuyor.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.variantId}>
                        <TableCell className="font-medium">{line.productName}</TableCell>
                        <TableCell className="text-sm">{line.sku}</TableCell>
                        <TableCell>{formatCurrency(line.price)}</TableCell>
                        <TableCell>
                          <Badge variant={stockVariant(line.stockQuantity)}>
                            {line.stockQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDraft({
                                line,
                                type: "In",
                                quantity: 1,
                                note: "",
                              })
                            }
                          >
                            Stok hareketi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Son {movements.length} hareket</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={typeFilter === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter("")}
                >
                  Tümü
                </Button>
                {MOVEMENT_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                  >
                    {STOCK_MOVEMENT_LABELS[type]}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
              ) : movements.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">
                  Henüz stok hareketi kaydedilmemiş.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Ürün</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Değişim</TableHead>
                      <TableHead>Sonuç</TableHead>
                      <TableHead>Kaynak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {movement.productName}
                        </TableCell>
                        <TableCell className="text-sm">{movement.sku}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {movement.typeName ||
                              STOCK_MOVEMENT_LABELS[movement.type] ||
                              movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            movement.quantity < 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.previousStock} → {movement.newStock}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                          {movement.note || movement.reference || movement.createdBy}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stok hareketi</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{draft.line.productName}</p>
                <p className="text-muted-foreground">
                  {draft.line.sku} · mevcut stok {draft.line.stockQuantity}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Hareket türü</Label>
                <div className="flex flex-wrap gap-2">
                  {MANUAL_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={draft.type === type ? "default" : "outline"}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          type,
                          quantity:
                            type === "Adjustment" ? draft.line.stockQuantity : draft.quantity,
                        })
                      }
                    >
                      {STOCK_MOVEMENT_LABELS[type]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-quantity">
                  {draft.type === "Adjustment" ? "Yeni stok adedi" : "Adet"}
                </Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min={0}
                  value={draft.quantity}
                  onChange={(e) =>
                    setDraft({ ...draft, quantity: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {draft.type === "Adjustment"
                    ? "Sayım sonucu bulunan stok yazılır, fark otomatik hesaplanır."
                    : draft.type === "Out"
                      ? "Girilen adet stoktan düşülür."
                      : "Girilen adet stoğa eklenir."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-note">Açıklama</Label>
                <Input
                  id="stock-note"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Örn. tedarikçi girişi, sayım farkı"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Vazgeç
            </Button>
            <Button
              onClick={() => draft && adjust.mutate(draft)}
              disabled={adjust.isPending}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function stockVariant(quantity: number): "default" | "secondary" | "destructive" {
  if (quantity <= 0) return "destructive";
  if (quantity < LOW_STOCK_THRESHOLD) return "secondary";
  return "default";
}
