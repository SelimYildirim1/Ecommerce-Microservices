"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFaq,
  deleteFaq,
  getFaqs,
  updateFaq,
  type AdminFaqItem,
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
  category: "Genel",
  question: "",
  answer: "",
  sortOrder: 0,
  isPublished: true,
};

export default function FaqsAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: getFaqs,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return updateFaq(editingId, form);
      return createFaq(form);
    },
    onSuccess: () => {
      toast.success("SSS kaydedildi.");
      setForm(emptyForm);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => {
      toast.success("SSS silindi.");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (item: AdminFaqItem) => {
    setEditingId(item.id);
    setForm({
      category: item.category,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isPublished: item.isPublished,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">SSS</h1>

      <div className="grid max-w-2xl gap-3 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Sıra</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Soru</Label>
          <Input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Cevap (HTML)</Label>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) =>
              setForm((f) => ({ ...f, isPublished: e.target.checked }))
            }
          />
          Yayınla
        </label>
        <div className="flex gap-2">
          <Button
            disabled={!form.question.trim() || !form.answer.trim() || saveMutation.isPending}
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
              <TableHead>Sıra</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Soru</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faqs.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.sortOrder}</TableCell>
                <TableCell>{f.category}</TableCell>
                <TableCell className="max-w-md">{f.question}</TableCell>
                <TableCell>{f.isPublished ? "Yayında" : "Taslak"}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => startEdit(f)}>
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Silinsin mi?")) deleteMutation.mutate(f.id);
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
  );
}
