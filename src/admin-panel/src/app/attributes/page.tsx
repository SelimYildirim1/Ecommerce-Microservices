"use client";

import { useQuery } from "@tanstack/react-query";
import { getAttributes } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tags } from "lucide-react";

const DATA_TYPE_COLORS: Record<string, string> = {
  Text: "bg-blue-100 text-blue-800",
  Number: "bg-green-100 text-green-800",
  Select: "bg-purple-100 text-purple-800",
  Color: "bg-pink-100 text-pink-800",
  Boolean: "bg-yellow-100 text-yellow-800",
};

export default function AttributesPage() {
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["attributes"],
    queryFn: getAttributes,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Özellik Yönetimi</h1>
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
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
