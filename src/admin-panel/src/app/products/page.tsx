"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkProducts,
  deleteProduct,
  duplicateProduct,
  exportProductsCsv,
  getCategories,
  getProducts,
  importProductsCsv,
  resolveImageUrl,
  setProductStatus,
  type BulkProductAction,
  type CategoryTree,
  type Product,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ImageIcon,
  Copy,
  Download,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

function flattenCategories(nodes: CategoryTree[], acc: { id: string; name: string }[] = []) {
  for (const n of nodes) {
    acc.push({ id: n.id, name: n.name });
    if (n.children?.length) flattenCategories(n.children, acc);
  }
  return acc;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: categoryTree = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const flatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "passive">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setProductStatus(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Ürün yayına alındı." : "Ürün yayından kaldırıldı.");
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Ürün pasife alındı.");
      invalidate();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateProduct,
    onSuccess: (r) => {
      toast.success(`Kopya oluşturuldu: ${r.name}`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkMutation = useMutation({
    mutationFn: ({
      action,
      categoryId,
    }: {
      action: BulkProductAction;
      categoryId?: string;
    }) => bulkProducts(action, selected, categoryId),
    onSuccess: (r) => {
      toast.success(`${r.count} ürün işlendi (${r.action}).`);
      setSelected([]);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const exportMutation = useMutation({
    mutationFn: exportProductsCsv,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV indirildi.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: importProductsCsv,
    onSuccess: (report) => {
      toast.success(
        `İçe aktarım: ${report.created} yeni, ${report.updated} güncellendi, ${report.skipped} atlandı.`,
      );
      if (report.errorCount > 0) {
        toast.error(`${report.errorCount} satırda hata var.`);
      }
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(term));
      const matchesCategory = !categoryFilter || p.categoryName === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? p.isActive : !p.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  useEffect(() => setPage(1), [search, categoryFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.categoryName))].sort(),
    [products]
  );

  const totalStock = (p: Product) =>
    p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);

  const minPrice = (p: Product) =>
    p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.price)) : 0;

  const allVisibleSelected =
    visible.length > 0 && visible.every((p) => selected.includes(p.id));

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((prev) => prev.filter((id) => !visible.some((p) => p.id === id)));
    } else {
      setSelected((prev) => [
        ...new Set([...prev, ...visible.map((p) => p.id)]),
      ]);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Ürün Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} ürün listeleniyor
            {selected.length > 0 ? ` · ${selected.length} seçili` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
          >
            <Download className="mr-2 h-4 w-4" /> CSV Dışa Aktar
          </Button>
          <Button
            variant="outline"
            disabled={importMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> CSV İçe Aktar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Link href="/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Yeni Ürün
            </Button>
          </Link>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <Button
            size="sm"
            variant="outline"
            disabled={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate({ action: "activate" })}
          >
            Aktifleştir
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate({ action: "deactivate" })}
          >
            Pasifleştir
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkMutation.isPending}
            onClick={() => {
              if (confirm(`${selected.length} ürün pasife alınacak. Devam?`)) {
                bulkMutation.mutate({ action: "delete" });
              }
            }}
          >
            Sil (pasif)
          </Button>
          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Kategori seç...</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkMutation.isPending || !bulkCategoryId}
            onClick={() =>
              bulkMutation.mutate({
                action: "changeCategory",
                categoryId: bulkCategoryId,
              })
            }
          >
            Kategori Değiştir
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Seçimi temizle
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ürün adı veya SKU ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "active" | "passive")
              }
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Sayfadakileri seç"
                      />
                    </TableHead>
                    <TableHead className="w-14"></TableHead>
                    <TableHead>Ürün Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Fiyat (min)</TableHead>
                    <TableHead>Toplam Stok</TableHead>
                    <TableHead>Varyant</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => toggle(p.id)}
                          aria-label={`${p.name} seç`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative h-10 w-10 overflow-hidden rounded border bg-muted">
                          {p.primaryImageUrl ? (
                            <Image
                              src={resolveImageUrl(p.primaryImageUrl)}
                              alt={p.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/products/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell>{p.categoryName}</TableCell>
                      <TableCell>{p.brandName}</TableCell>
                      <TableCell>{formatCurrency(minPrice(p))}</TableCell>
                      <TableCell>{totalStock(p)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.variants.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "destructive"}>
                          {p.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={p.isActive ? "Yayından kaldır" : "Yayına al"}
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({ id: p.id, isActive: !p.isActive })
                            }
                          >
                            {p.isActive ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Çoğalt"
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate(p.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Link href={`/products/${p.id}`}>
                            <Button variant="ghost" size="icon" title="Düzenle">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sil"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`"${p.name}" pasife alınacak. Devam edilsin mi?`)) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        Ürün bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Sayfa {currentPage} / {pageCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
