"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustWarehouseStock,
  createWarehouse,
  deleteWarehouse,
  getWarehouseStock,
  getWarehouses,
  updateWarehouse,
  type AdminWarehouse,
  type StockMovementType,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

const emptyForm = {
  name: "",
  code: "",
  address: "",
  isDefault: false,
  isActive: true,
};

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState({
    variantId: "",
    quantity: 0,
    type: "In" as StockMovementType,
    note: "",
  });

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  const { data: stockLines = [], isLoading: stockLoading } = useQuery({
    queryKey: ["warehouse-stock", selectedId],
    queryFn: () => getWarehouseStock(selectedId!),
    enabled: !!selectedId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        isDefault: form.isDefault,
        isActive: form.isActive,
      };
      if (editingId) return updateWarehouse(editingId, payload);
      return createWarehouse(payload);
    },
    onSuccess: () => {
      toast.success("Depo kaydedildi.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      toast.success("Depo silindi.");
      if (selectedId) setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjustWarehouseStock(selectedId!, {
        variantId: adjust.variantId.trim(),
        quantity: Number(adjust.quantity) || 0,
        type: adjust.type,
        note: adjust.note || null,
      }),
    onSuccess: (r) => {
      toast.success(`Stok güncellendi: ${r.sku} (depo ${r.warehouseQuantity}, toplam ${r.totalStock})`);
      setAdjust({ variantId: "", quantity: 0, type: "In", note: "" });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stock", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (item: AdminWarehouse) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      code: item.code ?? "",
      address: item.address ?? "",
      isDefault: item.isDefault,
      isActive: item.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Depolar</h1>
        <p className="text-sm text-muted-foreground">
          Depo bazlı stok ve stok düzeltme.
        </p>
      </div>

      <div className="grid max-w-2xl gap-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Ad</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Merkez Depo"
            />
          </div>
          <div className="space-y-2">
            <Label>Kod</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="MRK"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Adres</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            Varsayılan
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Aktif
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={saveMutation.isPending || !form.name.trim()}
            onClick={() => saveMutation.mutate()}
          >
            {editingId ? "Güncelle" : "Ekle"}
          </Button>
          {editingId && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              İptal
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Kod</TableHead>
              <TableHead>Stok satırı</TableHead>
              <TableHead>Toplam birim</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((w) => (
              <TableRow
                key={w.id}
                className={selectedId === w.id ? "bg-muted/50" : undefined}
              >
                <TableCell className="font-medium">
                  {w.name}
                  {w.isDefault && (
                    <Badge className="ml-2" variant="secondary">
                      Varsayılan
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{w.code ?? "—"}</TableCell>
                <TableCell>{w.stockLines ?? 0}</TableCell>
                <TableCell>{w.totalUnits ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={w.isActive ? "default" : "destructive"}>
                    {w.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(w.id)}>
                    Stok
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(w)}>
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={w.isDefault}
                    onClick={() => {
                      if (confirm(`"${w.name}" silinsin mi?`)) deleteMutation.mutate(w.id);
                    }}
                  >
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {warehouses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Henüz depo yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {selectedId && (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="text-xl font-semibold">Depo stoku</h2>
          <div className="grid max-w-xl gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Varyant Id</Label>
              <Input
                value={adjust.variantId}
                onChange={(e) => setAdjust((a) => ({ ...a, variantId: e.target.value }))}
                placeholder="guid"
              />
            </div>
            <div className="space-y-1">
              <Label>Miktar</Label>
              <Input
                type="number"
                value={adjust.quantity}
                onChange={(e) =>
                  setAdjust((a) => ({ ...a, quantity: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tür</Label>
              <select
                value={adjust.type}
                onChange={(e) =>
                  setAdjust((a) => ({
                    ...a,
                    type: e.target.value as StockMovementType,
                  }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="In">Giriş</option>
                <option value="Out">Çıkış</option>
                <option value="Adjustment">Düzeltme</option>
                <option value="Return">İade</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Not (opsiyonel)"
              value={adjust.note}
              onChange={(e) => setAdjust((a) => ({ ...a, note: e.target.value }))}
              className="max-w-md"
            />
            <Button
              disabled={adjustMutation.isPending || !adjust.variantId.trim()}
              onClick={() => adjustMutation.mutate()}
            >
              Stok uygula
            </Button>
          </div>

          {stockLoading ? (
            <p className="text-muted-foreground">Stok yükleniyor...</p>
          ) : stockLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu depoda kayıtlı stok satırı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Miktar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
