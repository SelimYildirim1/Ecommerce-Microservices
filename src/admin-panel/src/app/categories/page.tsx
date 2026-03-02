"use client";

import { useQuery } from "@tanstack/react-query";
import { getCategories, getCategory } from "@/lib/api";
import type { CategoryTree, CategoryDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { useState } from "react";

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: detail } = useQuery({
    queryKey: ["category", selectedId],
    queryFn: () => getCategory(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kategori & Özellik Yönetimi</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kategori Ağacı */}
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
              <div className="space-y-1">
                {categories.map((cat) => (
                  <CategoryNode
                    key={cat.id}
                    category={cat}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kategori Detayı */}
        <Card>
          <CardHeader>
            <CardTitle>
              {detail ? `${detail.name} - Özellikler` : "Kategori Seçiniz"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!detail ? (
              <p className="text-muted-foreground">
                Sol taraftan bir kategori seçerek özelliklerini görüntüleyin.
              </p>
            ) : detail.attributes.length === 0 ? (
              <p className="text-muted-foreground">Bu kategoriye henüz özellik atanmamış.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Özellik</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Zorunlu</TableHead>
                    <TableHead>Varyant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.attributes.map((attr) => (
                    <TableRow key={attr.id}>
                      <TableCell className="font-medium">{attr.attributeName}</TableCell>
                      <TableCell className="font-mono text-sm">{attr.attributeCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{attr.dataType}</Badge>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryNode({
  category,
  depth,
  selectedId,
  onSelect,
}: {
  category: CategoryTree;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(category.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
          isSelected ? "bg-accent font-medium" : ""
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        ) : (
          <span className="w-4" />
        )}
        <span>{category.name}</span>
        {category.attributeCount > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {category.attributeCount} özellik
          </Badge>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
