"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCurrency,
  deleteCurrency,
  getCurrencies,
  updateCurrency,
  type AdminCurrency,
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
import toast from "react-hot-toast";

const emptyForm = {
  code: "",
  symbol: "",
  name: "",
  rateToBase: 1,
  isDefault: false,
  isActive: true,
};

export default function CurrenciesAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: getCurrencies,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        rateToBase: Number(form.rateToBase) || 1,
      };
      if (editingId) return updateCurrency(editingId, payload);
      return createCurrency(payload);
    },
    onSuccess: () => {
      toast.success("Para birimi kaydedildi.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCurrency,
    onSuccess: () => {
      toast.success("Para birimi silindi.");
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (item: AdminCurrency) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      symbol: item.symbol,
      name: item.name,
      rateToBase: item.rateToBase,
      isDefault: item.isDefault,
      isActive: item.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Para Birimleri</h1>
      <p className="text-sm text-muted-foreground">
        RateToBase: 1 birim bu para = RateToBase birim varsayılan para (TRY).
      </p>

      <div className="grid max-w-2xl gap-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Kod</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="USD"
            />
          </div>
          <div className="space-y-2">
            <Label>Sembol</Label>
            <Input
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="$"
            />
          </div>
          <div className="space-y-2">
            <Label>Kur (RateToBase)</Label>
            <Input
              type="number"
              step="0.0001"
              value={form.rateToBase}
              onChange={(e) =>
                setForm((f) => ({ ...f, rateToBase: Number(e.target.value) || 0 }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Ad</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="US Dollar"
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
            onClick={() => saveMutation.mutate()}
            disabled={!form.code.trim() || saveMutation.isPending}
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

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="p-4 text-muted-foreground">Yükleniyor...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Kur</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.symbol} {c.code}
                  </TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.rateToBase}</TableCell>
                  <TableCell>
                    {c.isDefault ? "Varsayılan" : c.isActive ? "Aktif" : "Pasif"}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={c.isDefault}
                      onClick={() => {
                        if (confirm(`${c.code} silinsin mi?`)) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                    >
                      Sil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
