"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, type AuditLogEntry } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

export default function AuditLogsPage() {
  const router = useRouter();
  const { canViewAudit, isAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const pageSize = 25;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["audit-logs", page, action, entityType],
    queryFn: () =>
      getAuditLogs({
        page,
        pageSize,
        action: action.trim() || undefined,
        entityType: entityType.trim() || undefined,
      }),
    enabled: canViewAudit,
  });

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Tarih",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "user",
        accessorFn: (row) => row.userName || row.userId,
        header: "Kullanıcı",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.userName || row.original.userId}</p>
            {row.original.userName ? (
              <p className="text-xs text-muted-foreground">{row.original.userId}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Aksiyon",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.action}</span>
        ),
      },
      {
        id: "entity",
        accessorFn: (row) => row.entityType || "",
        header: "Entity",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.entityType || "—"}
            {row.original.entityId ? (
              <span className="block text-xs text-muted-foreground">{row.original.entityId}</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: "IP",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ipAddress || "—"}</span>
        ),
      },
      {
        id: "changes",
        enableSorting: false,
        header: "Değişiklik",
        cell: ({ row }) => (
          <div className="max-w-[280px]">
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
              {row.original.newValues || row.original.oldValues || "—"}
            </pre>
          </div>
        ),
      },
    ],
    []
  );

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Denetim Kayıtları</h1>
        <p className="text-muted-foreground">
          Bu sayfaya yalnızca Admin rolü erişebilir.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Dashboard&apos;a dön
        </Button>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Denetim Kayıtları</h1>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Admin işlemleri
            {data ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({data.total} kayıt)
                {isFetching ? " · güncelleniyor..." : ""}
              </span>
            ) : null}
          </CardTitle>
          <div className="flex flex-wrap gap-3">
            <Input
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
              placeholder="Aksiyon ara (PUT, Delete...)"
              className="max-w-xs"
            />
            <Input
              value={entityType}
              onChange={(e) => {
                setPage(1);
                setEntityType(e.target.value);
              }}
              placeholder="Entity tipi"
              className="max-w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            emptyMessage="Kayıt bulunamadı."
            getRowId={(row) => row.id}
            pagination={{
              page,
              pageSize,
              totalCount: data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
