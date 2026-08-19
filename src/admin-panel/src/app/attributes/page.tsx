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

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeOptions(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join(",");
}

function AttributeOptionsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [items, setItems] = useState(() => parseOptions(value));
  const [draft, setDraft] = useState("");

  const commit = (next: string[]) => {
    setItems(next);
    onChange(serializeOptions(next));
  };

  const add = () => {
    const next = draft.replaceAll(",", "").trim();
    if (!next) return;
    const exists = items.some(
      (item) => item.toLocaleLowerCase("tr-TR") === next.toLocaleLowerCase("tr-TR")
    );
    if (exists) {
      setDraft("");
      return;
    }
    commit([...items, next]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="attr-option-draft">Seçenekler</Label>
      <p className="text-xs text-muted-foreground">
        Ürün formunda açılır liste olarak gösterilir. Örn: Kırmızı, Mavi, Siyah
      </p>

      {items.length > 0 && (
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = e.target.value.replaceAll(",", "");
                  commit(next);
                }}
                className="h-8"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Seçeneği sil"
                onClick={() => commit(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          id="attr-option-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Yeni seçenek yazıp Ekle'ye basın"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="mr-1 h-4 w-4" />
          Ekle
        </Button>
      </div>
    </div>
  );
}

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
                    <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                      {attr.options ? (
                        <span className="line-clamp-2">
                          {parseOptions(attr.options).join(", ")}
                        </span>
                      ) : (
                        "-"
                      )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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

            {editing && editing.dataType !== "Boolean" && (
              <AttributeOptionsEditor
                key={editing.id ?? "new"}
                value={editing.options ?? ""}
                onChange={(options) =>
                  setEditing((prev) => (prev ? { ...prev, options } : prev))
                }
              />
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
