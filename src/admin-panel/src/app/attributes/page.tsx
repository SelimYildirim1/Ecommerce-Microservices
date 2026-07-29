"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAttribute,
  deleteAttribute,
  getAttributes,
  updateAttribute,
} from "@/lib/api";
import type { AttributePayload, ProductAttribute } from "@/lib/api";
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
import { Tags, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const DATA_TYPES = ["Text", "Number", "Select", "Color", "Boolean"] as const;

const DATA_TYPE_COLORS: Record<string, string> = {
  Text: "bg-blue-100 text-blue-800",
  Number: "bg-green-100 text-green-800",
  Select: "bg-purple-100 text-purple-800",
  Color: "bg-pink-100 text-pink-800",
  Boolean: "bg-yellow-100 text-yellow-800",
};

type EditingAttribute = AttributePayload & { id?: string };

const emptyAttribute: EditingAttribute = {
  name: "",
  code: "",
  dataType: "Text",
  options: "",
  isRequired: false,
  isVariant: false,
};

export default function AttributesPage() {
  const queryClient = useQueryClient();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["attributes"],
    queryFn: getAttributes,
  });

  const [editing, setEditing] = useState<EditingAttribute | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["attributes"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, ...payload }: EditingAttribute) => {
      const body: AttributePayload = {
        ...payload,
        options: payload.options?.trim() ? payload.options.trim() : null,
      };
      return id ? updateAttribute(id, body) : createAttribute(body);
    },
    onSuccess: () => {
      toast.success("Özellik kaydedildi.");
      setEditing(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttribute(id),
    onSuccess: () => {
      toast.success("Özellik silindi.");
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const startEdit = (attr: ProductAttribute) =>
    setEditing({
      id: attr.id,
      name: attr.name,
      code: attr.code,
      dataType: attr.dataType,
      options: attr.options ?? "",
      isRequired: attr.isRequired,
      isVariant: attr.isVariant,
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Özellik Yönetimi</h1>
        <Button onClick={() => setEditing({ ...emptyAttribute })}>
          <Plus className="mr-2 h-4 w-4" /> Yeni Özellik
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Tanımlı Özellikler ({attributes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Özellik Adı</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Veri Tipi</TableHead>
                  <TableHead>Seçenekler</TableHead>
                  <TableHead>Zorunlu</TableHead>
                  <TableHead>Varyant</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attr) => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">{attr.name}</TableCell>
                    <TableCell className="font-mono text-sm">{attr.code}</TableCell>
                    <TableCell>
                      <Badge className={DATA_TYPE_COLORS[attr.dataType] || ""}>
                        {attr.dataType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {attr.options || "-"}
                    </TableCell>
                    <TableCell>
                      {attr.isRequired ? (
                        <Badge variant="default">Evet</Badge>
                      ) : (
                        <span className="text-muted-foreground">Hayır</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {attr.isVariant ? (
                        <Badge className="bg-blue-100 text-blue-800">Evet</Badge>
                      ) : (
                        <span className="text-muted-foreground">Hayır</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Düzenle"
                          onClick={() => startEdit(attr)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Sil"
                          onClick={() => {
                            if (confirm(`"${attr.name}" silinecek. Emin misiniz?`)) {
                              deleteMutation.mutate(attr.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {attributes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Henüz özellik tanımlanmamış
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Özelliği Düzenle" : "Yeni Özellik"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="attr-name">Ad</Label>
                <Input
                  id="attr-name"
                  value={editing?.name ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                  }
                  placeholder="Renk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-code">Kod</Label>
                <Input
                  id="attr-code"
                  value={editing?.code ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, code: e.target.value } : prev))
                  }
                  placeholder="renk"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attr-type">Veri Tipi</Label>
              <select
                id="attr-type"
                value={editing?.dataType ?? "Text"}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, dataType: e.target.value } : prev))
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {editing?.dataType === "Select" && (
              <div className="space-y-2">
                <Label htmlFor="attr-options">Seçenekler (virgülle ayırın)</Label>
                <Input
                  id="attr-options"
                  value={editing?.options ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, options: e.target.value } : prev))
                  }
                  placeholder="S, M, L, XL"
                />
              </div>
            )}

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing?.isRequired ?? false}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, isRequired: e.target.checked } : prev
                    )
                  }
                  className="h-4 w-4"
                />
                Zorunlu
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing?.isVariant ?? false}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, isVariant: e.target.checked } : prev
                    )
                  }
                  className="h-4 w-4"
                />
                Varyant oluşturur
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              İptal
            </Button>
            <Button
              disabled={
                !editing?.name.trim() || !editing?.code.trim() || saveMutation.isPending
              }
              onClick={() => editing && saveMutation.mutate(editing)}
            >
              {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
