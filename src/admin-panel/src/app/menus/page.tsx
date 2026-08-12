"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNavMenu,
  createNavMenuItem,
  deleteNavMenu,
  deleteNavMenuItem,
  getNavMenus,
  reorderNavMenuItems,
  updateNavMenu,
  updateNavMenuItem,
  type NavMenu,
  type NavMenuItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function MenusPage() {
  const queryClient = useQueryClient();
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["nav-menus"],
    queryFn: getNavMenus,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuLocation, setNewMenuLocation] = useState("header");
  const [itemLabel, setItemLabel] = useState("");
  const [itemUrl, setItemUrl] = useState("");

  const selected = menus.find((m) => m.id === selectedId) ?? menus[0] ?? null;

  useEffect(() => {
    if (!selectedId && menus[0]) setSelectedId(menus[0].id);
  }, [menus, selectedId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["nav-menus"] });

  const createMenu = useMutation({
    mutationFn: () =>
      createNavMenu({ name: newMenuName, location: newMenuLocation, isActive: true }),
    onSuccess: (menu) => {
      toast.success("Menü oluşturuldu.");
      setNewMenuName("");
      setSelectedId(menu.id);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (menu: NavMenu) =>
      updateNavMenu(menu.id, {
        name: menu.name,
        location: menu.location,
        isActive: !menu.isActive,
      }),
    onSuccess: () => {
      toast.success("Menü güncellendi.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMenu = useMutation({
    mutationFn: deleteNavMenu,
    onSuccess: () => {
      toast.success("Menü silindi.");
      setSelectedId(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: () =>
      createNavMenuItem(selected!.id, {
        label: itemLabel,
        url: itemUrl,
        linkType: "custom",
        sortOrder: selected?.items?.length ?? 0,
        isActive: true,
      }),
    onSuccess: () => {
      toast.success("Öğe eklendi.");
      setItemLabel("");
      setItemUrl("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: deleteNavMenuItem,
    onSuccess: () => {
      toast.success("Öğe silindi.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rootItems = (selected?.itemTree ?? selected?.items ?? []).filter(
    (i) => !i.parentId,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (event: DragEndEvent) => {
    if (!selected) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rootItems.findIndex((i) => i.id === active.id);
    const newIndex = rootItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(rootItems, oldIndex, newIndex).map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));

    try {
      await reorderNavMenuItems(selected.id, reordered);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sıralama kaydedilemedi.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Menüler</h1>
        <p className="text-sm text-muted-foreground">
          Header ve footer bağlantılarını sürükle-bırak ile düzenleyin.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Menü listesi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : (
              menus.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => setSelectedId(menu.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                    selected?.id === menu.id ? "border-primary bg-accent" : ""
                  }`}
                >
                  <span>
                    {menu.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({menu.location})
                    </span>
                  </span>
                  {!menu.isActive && (
                    <span className="text-xs text-muted-foreground">pasif</span>
                  )}
                </button>
              ))
            )}

            <div className="space-y-2 border-t pt-3">
              <Label>Yeni menü</Label>
              <Input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="Menü adı"
              />
              <select
                value={newMenuLocation}
                onChange={(e) => setNewMenuLocation(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="header">header</option>
                <option value="footer">footer</option>
                <option value="mobile">mobile</option>
              </select>
              <Button
                size="sm"
                disabled={!newMenuName.trim() || createMenu.isPending}
                onClick={() => createMenu.mutate()}
              >
                <Plus className="mr-1 h-4 w-4" /> Ekle
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selected ? selected.name : "Menü seçin"}</CardTitle>
            {selected && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive.mutate(selected)}
                >
                  {selected.isActive ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Menü silinsin mi?")) removeMenu.mutate(selected.id);
                  }}
                >
                  Sil
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-muted-foreground">Soldan bir menü seçin.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={itemLabel}
                    onChange={(e) => setItemLabel(e.target.value)}
                    placeholder="Etiket"
                    className="max-w-[180px]"
                  />
                  <Input
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    placeholder="/urunler"
                    className="max-w-[220px]"
                  />
                  <Button
                    disabled={!itemLabel.trim() || addItem.isPending}
                    onClick={() => addItem.mutate()}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Öğe ekle
                  </Button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={rootItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {rootItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Henüz öğe yok.</p>
                      ) : (
                        rootItems.map((item) => (
                          <SortableMenuRow
                            key={item.id}
                            item={item}
                            onSave={async (next) => {
                              await updateNavMenuItem(item.id, {
                                label: next.label,
                                url: next.url,
                                linkType: next.linkType || "custom",
                                parentId: next.parentId,
                                referenceId: next.referenceId,
                                sortOrder: next.sortOrder,
                                isActive: next.isActive,
                                openInNewTab: next.openInNewTab,
                              });
                              refresh();
                            }}
                            onDelete={() => removeItem.mutate(item.id)}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SortableMenuRow({
  item,
  onSave,
  onDelete,
}: {
  item: NavMenuItem;
  onSave: (item: NavMenuItem) => Promise<void>;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });
  const [label, setLabel] = useState(item.label);
  const [url, setUrl] = useState(item.url ?? "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card px-2 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label !== item.label || url !== (item.url ?? "")) {
            onSave({ ...item, label, url }).catch((e) =>
              toast.error(e instanceof Error ? e.message : "Kayıt hatası"),
            );
          }
        }}
        className="h-8 max-w-[180px]"
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => {
          if (label !== item.label || url !== (item.url ?? "")) {
            onSave({ ...item, label, url }).catch((e) =>
              toast.error(e instanceof Error ? e.message : "Kayıt hatası"),
            );
          }
        }}
        className="h-8 flex-1"
      />
      <Button type="button" size="icon" variant="ghost" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
