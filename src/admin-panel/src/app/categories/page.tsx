"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignCategoryAttribute,
  createCategory,
  deleteCategory,
  getAttributes,
  getCategories,
  getCategory,
  removeCategoryAttribute,
  reorderCategories,
  resolveImageUrl,
  updateCategory,
  uploadImage,
} from "@/lib/api";
import type { CategoryTree } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  GripVertical,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type EditingCategory = {
  id?: string;
  name: string;
  parentId: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  isFeatured: boolean;
  showInMenu: boolean;
  metaTitle: string;
  metaDescription: string;
};

function flatten(
  tree: CategoryTree[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  return tree.flatMap((c) => [
    { id: c.id, name: c.name, depth },
    ...flatten(c.children ?? [], depth + 1),
  ]);
}

function collectSubtreeIds(tree: CategoryTree[], rootId: string): Set<string> {
  const ids = new Set<string>();

  const walk = (nodes: CategoryTree[], collecting: boolean) => {
    for (const node of nodes) {
      const active = collecting || node.id === rootId;
      if (active) ids.add(node.id);
      walk(node.children ?? [], active);
    }
  };

  walk(tree, false);
  return ids;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: allAttributes = [] } = useQuery({
    queryKey: ["attributes"],
    queryFn: getAttributes,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingCategory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [attributeToAssign, setAttributeToAssign] = useState("");
  const [assignFilterable, setAssignFilterable] = useState(true);

  const { data: detail } = useQuery({
    queryKey: ["category", selectedId],
    queryFn: () => getCategory(selectedId!),
    enabled: !!selectedId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: ["category", selectedId] });
  };

  const saveMutation = useMutation({
    mutationFn: (data: EditingCategory) => {
      const payload = {
        name: data.name,
        parentId: data.parentId || null,
        slug: data.slug || null,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder,
        isFeatured: data.isFeatured,
        showInMenu: data.showInMenu,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      };
      return data.id
        ? updateCategory(data.id, payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      toast.success("Kategori kaydedildi.");
      setEditing(null);
      refresh();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: (_, id) => {
      toast.success("Kategori silindi.");
      if (selectedId === id) setSelectedId(null);
      refresh();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignCategoryAttribute(selectedId!, {
        attributeId: attributeToAssign,
        sortOrder: detail?.attributes.length ?? 0,
        isFilterable: assignFilterable,
      }),
    onSuccess: () => {
      toast.success("Özellik kategoriye atandı.");
      setAttributeDialogOpen(false);
      setAttributeToAssign("");
      refresh();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const removeAttributeMutation = useMutation({
    mutationFn: (attributeId: string) =>
      removeCategoryAttribute(selectedId!, attributeId),
    onSuccess: () => {
      toast.success("Özellik kaldırıldı.");
      refresh();
    },
    onError: (err: Error) => toast.error(`Hata: ${err.message}`),
  });

  const parentOptions = useMemo(() => {
    const all = flatten(categories);
    if (!editing?.id) return all;

    const blocked = collectSubtreeIds(categories, editing.id);
    return all.filter((c) => !blocked.has(c.id));
  }, [categories, editing?.id]);

  const availableAttributes = useMemo(() => {
    const assigned = new Set(detail?.attributes.map((a) => a.attributeId) ?? []);
    return allAttributes.filter((a) => !assigned.has(a.id));
  }, [allAttributes, detail]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onRootDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(categories, oldIndex, newIndex).map((c, index) => ({
      id: c.id,
      sortOrder: index,
      clearParent: true as const,
    }));

    try {
      await reorderCategories(reordered);
      refresh();
      toast.success("Sıralama kaydedildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sıralama hatası");
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      setEditing({ ...editing, imageUrl: result.url });
      toast.success("Görsel yüklendi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kategori & Özellik Yönetimi</h1>
        <Button
          onClick={() =>
            setEditing({
              name: "",
              parentId: "",
              slug: "",
              imageUrl: "",
              sortOrder: 0,
              isFeatured: false,
              showInMenu: true,
              metaTitle: "",
              metaDescription: "",
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Yeni Kategori
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Kategori Ağacı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Yükleniyor...</p>
            ) : categories.length === 0 ? (
              <p className="text-muted-foreground">Henüz kategori yok.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onRootDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <CategoryNode
                        key={cat.id}
                        category={cat}
                        depth={0}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        sortable
                        onEdit={async (c) => {
                          setEditing({
                            id: c.id,
                            name: c.name,
                            parentId: c.parentId ?? "",
                            slug: c.slug ?? "",
                            imageUrl: c.imageUrl ?? "",
                            sortOrder: c.sortOrder ?? 0,
                            isFeatured: c.isFeatured ?? false,
                            showInMenu: c.showInMenu ?? true,
                            metaTitle: c.metaTitle ?? "",
                            metaDescription: c.metaDescription ?? "",
                          });
                          try {
                            const fresh = await getCategory(c.id);
                            setEditing((prev) =>
                              prev && prev.id === c.id
                                ? {
                                    ...prev,
                                    imageUrl: fresh.imageUrl ?? "",
                                    slug: fresh.slug ?? prev.slug,
                                    sortOrder: fresh.sortOrder ?? prev.sortOrder,
                                    isFeatured: fresh.isFeatured ?? prev.isFeatured,
                                    showInMenu: fresh.showInMenu ?? prev.showInMenu,
                                    metaTitle: fresh.metaTitle ?? prev.metaTitle,
                                    metaDescription:
                                      fresh.metaDescription ?? prev.metaDescription,
                                  }
                                : prev,
                            );
                          } catch {
                            // Ağaçtaki imageUrl ile devam
                          }
                        }}
                        onDelete={(c) => {
                          if (
                            confirm(`"${c.name}" kategorisi silinecek. Emin misiniz?`)
                          ) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {detail ? `${detail.name} — Özellikler` : "Kategori Seçiniz"}
              </CardTitle>
              {detail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAttributeDialogOpen(true)}
                  disabled={availableAttributes.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" /> Özellik Ata
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!detail ? (
              <p className="text-muted-foreground">
                Sol taraftan bir kategori seçerek özelliklerini görüntüleyin.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {detail.slug && <Badge variant="outline">/{detail.slug}</Badge>}
                  {detail.isFeatured && (
                    <Badge className="bg-amber-100 text-amber-800">Öne çıkan</Badge>
                  )}
                  {detail.showInMenu === false && (
                    <Badge variant="secondary">Menüde gizli</Badge>
                  )}
                  {detail.imageUrl && (
                    <img
                      src={resolveImageUrl(detail.imageUrl)}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                </div>

                {detail.attributes.length === 0 ? (
                  <p className="text-muted-foreground">
                    Bu kategoriye henüz özellik atanmamış.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Özellik</TableHead>
                        <TableHead>Kod</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Varyant</TableHead>
                        <TableHead>Filtre</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.attributes.map((attr) => (
                        <TableRow key={attr.id}>
                          <TableCell className="font-medium">
                            {attr.attributeName}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attr.attributeCode}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{attr.dataType}</Badge>
                          </TableCell>
                          <TableCell>
                            {attr.isVariant ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Evet
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Hayır</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {attr.isFilterable ? (
                              <Badge variant="secondary">Evet</Badge>
                            ) : (
                              <span className="text-muted-foreground">Hayır</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Kaldır"
                              onClick={() =>
                                removeAttributeMutation.mutate(attr.attributeId)
                              }
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Kategoriyi Düzenle" : "Yeni Kategori"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Kategori Adı</Label>
              <Input
                id="category-name"
                value={editing?.name ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                placeholder="Örn: Elektronik"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug (URL)</Label>
              <Input
                id="category-slug"
                value={editing?.slug ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, slug: e.target.value } : prev,
                  )
                }
                placeholder="Bos birakilirsa addan uretilir"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-parent">Üst Kategori</Label>
              <select
                id="category-parent"
                value={editing?.parentId ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, parentId: e.target.value } : prev,
                  )
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">(Kök kategori)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"—".repeat(c.depth)} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-sort">Sıra</Label>
              <Input
                id="category-sort"
                type="number"
                value={editing?.sortOrder ?? 0}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev
                      ? { ...prev, sortOrder: Number(e.target.value) || 0 }
                      : prev,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori görseli</Label>
              {editing?.imageUrl ? (
                <div className="mb-2 flex items-center gap-3">
                  <img
                    key={editing.imageUrl}
                    src={resolveImageUrl(editing.imageUrl)}
                    alt={editing.name || "Kategori"}
                    className="h-20 w-20 rounded-lg border object-cover bg-muted"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = el.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.hidden = false;
                    }}
                  />
                  <div
                    hidden
                    className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted text-[10px] text-muted-foreground"
                  >
                    Yüklenemedi
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-xs text-muted-foreground">
                      {editing.imageUrl}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditing((prev) =>
                          prev ? { ...prev, imageUrl: "" } : prev,
                        )
                      }
                    >
                      Kaldır
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Görsel yok</p>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Yükleniyor..." : "Görsel yükle"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) =>
                    handleImageUpload(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing?.isFeatured ?? false}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, isFeatured: e.target.checked } : prev,
                  )
                }
                className="h-4 w-4"
              />
              Öne çıkan (ana sayfa şeridi)
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing?.showInMenu ?? true}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, showInMenu: e.target.checked } : prev,
                  )
                }
                className="h-4 w-4"
              />
              Header menüsünde göster
            </label>

            <div className="space-y-2">
              <Label htmlFor="category-meta-title">Meta Title (SEO)</Label>
              <Input
                id="category-meta-title"
                value={editing?.metaTitle ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, metaTitle: e.target.value } : prev,
                  )
                }
                placeholder="Boş bırakılırsa kategori adı kullanılır"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-meta-desc">Meta Description</Label>
              <Textarea
                id="category-meta-desc"
                rows={3}
                value={editing?.metaDescription ?? ""}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, metaDescription: e.target.value } : prev,
                  )
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              İptal
            </Button>
            <Button
              disabled={!editing?.name.trim() || saveMutation.isPending}
              onClick={() => editing && saveMutation.mutate(editing)}
            >
              {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attributeDialogOpen} onOpenChange={setAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriye Özellik Ata</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-attribute">Özellik</Label>
              <select
                id="assign-attribute"
                value={attributeToAssign}
                onChange={(e) => setAttributeToAssign(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Seçiniz...</option>
                {availableAttributes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.dataType})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assignFilterable}
                onChange={(e) => setAssignFilterable(e.target.checked)}
                className="h-4 w-4"
              />
              Mağazada filtre olarak kullanılsın
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttributeDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              disabled={!attributeToAssign || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Atanıyor..." : "Ata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryNode({
  category,
  depth,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  sortable = false,
}: {
  category: CategoryTree;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (category: CategoryTree) => void;
  onDelete: (category: CategoryTree) => void;
  sortable?: boolean;
}) {
  if (sortable && depth === 0) {
    return (
      <SortableRootCategory
        category={category}
        selectedId={selectedId}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <CategoryRow
      category={category}
      depth={depth}
      selectedId={selectedId}
      onSelect={onSelect}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function SortableRootCategory({
  category,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  category: CategoryTree;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (category: CategoryTree) => void;
  onDelete: (category: CategoryTree) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <CategoryRow
        category={category}
        depth={0}
        selectedId={selectedId}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

function CategoryRow({
  category,
  depth,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  dragHandleProps,
}: {
  category: CategoryTree;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (category: CategoryTree) => void;
  onDelete: (category: CategoryTree) => void;
  dragHandleProps?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listeners?: any;
  };
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-accent ${
          isSelected ? "bg-accent" : ""
        }`}
      >
        {dragHandleProps && (
          <button
            type="button"
            className="cursor-grab px-1 text-muted-foreground"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => {
            onSelect(category.id);
            if (hasChildren) setExpanded(!expanded);
          }}
          className={`flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm ${
            isSelected ? "font-medium" : ""
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
          {category.imageUrl && (
            <img
              src={resolveImageUrl(category.imageUrl)}
              alt=""
              className="h-6 w-6 rounded object-cover"
            />
          )}
          <span>{category.name}</span>
          {category.isFeatured && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">★</Badge>
          )}
          {category.attributeCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {category.attributeCount} özellik
            </Badge>
          )}
        </button>

        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            title="Düzenle"
            onClick={() => onEdit(category)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            title="Sil"
            onClick={() => onDelete(category)}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
