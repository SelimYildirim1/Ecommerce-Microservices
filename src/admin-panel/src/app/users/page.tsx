"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignUserRole,
  getAuthRoles,
  getCustomers,
  removeUserRole,
  setCustomerBlocked,
  type Customer,
} from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ban, Shield, ShieldCheck, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const MANAGEABLE_ROLES = ["Admin", "Editor", "Support", "Warehouse", "Customer"];

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canManageUsers, isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getCustomers(undefined, 1, 200),
    enabled: canManageUsers,
  });

  const users = pageData?.items ?? [];

  const { data: roles = [] } = useQuery({
    queryKey: ["auth-roles"],
    queryFn: getAuthRoles,
    enabled: canManageUsers,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u: Customer) =>
      [u.userName, u.email, u.firstName, u.lastName, ...(u.roles ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [users, search]);

  const assignMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      assignUserRole(userId, role),
    onSuccess: () => {
      toast.success("Rol atandı.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      removeUserRole(userId, role),
    onSuccess: () => {
      toast.success("Rol kaldırıldı.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      setCustomerBlocked(id, blocked),
    onSuccess: (_, variables) => {
      toast.success(variables.blocked ? "Hesap engellendi." : "Engel kaldırıldı.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Kullanıcı & Roller</h1>
        <p className="text-muted-foreground">
          Bu sayfaya yalnızca Admin rolü erişebilir.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Dashboard&apos;a dön
        </Button>
      </div>
    );
  }

  const assignableRoles = (roles.length > 0 ? roles : MANAGEABLE_ROLES).filter(
    (r) => r !== "Guest",
  );

  const onAssign = (user: Customer) => {
    const role = roleDraft[user.id];
    if (!role) {
      toast.error("Önce bir rol seçin.");
      return;
    }
    if (user.roles.includes(role)) {
      toast.error("Kullanıcı zaten bu role sahip.");
      return;
    }
    assignMutation.mutate({ userId: user.id, role });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kullanıcı & Roller</h1>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Kullanıcılar ({filtered.length})
          </CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, e-posta veya rol ara"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Roller</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="min-w-[220px]">Rol ata</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const fullName =
                    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                    user.userName;
                  const isUserAdmin = user.roles.includes("Admin");

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium">{fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.userName}</p>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === "Admin" ? "default" : "outline"}
                              className="cursor-pointer gap-1"
                              title="Rolü kaldırmak için tıklayın"
                              onClick={() => {
                                if (
                                  confirm(
                                    `${user.userName} kullanıcısından "${role}" rolünü kaldırmak istiyor musunuz?`,
                                  )
                                ) {
                                  removeMutation.mutate({
                                    userId: user.id,
                                    role,
                                  });
                                }
                              }}
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive">Engelli</Badge>
                        ) : (
                          <Badge variant="outline">Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={roleDraft[user.id] ?? ""}
                            onValueChange={(value) =>
                              setRoleDraft((prev) => ({ ...prev, [user.id]: value }))
                            }
                          >
                            <SelectTrigger className="h-8 w-[130px]">
                              <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignableRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onAssign(user)}
                            disabled={assignMutation.isPending}
                          >
                            <Shield className="mr-1 h-3.5 w-3.5" />
                            Ata
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={user.isBlocked ? "outline" : "destructive"}
                          disabled={isUserAdmin && !user.isBlocked}
                          title={
                            isUserAdmin && !user.isBlocked
                              ? "Yönetici hesabı engellenemez"
                              : undefined
                          }
                          onClick={() =>
                            blockMutation.mutate({
                              id: user.id,
                              blocked: !user.isBlocked,
                            })
                          }
                        >
                          {user.isBlocked ? (
                            <>
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Engeli kaldır
                            </>
                          ) : (
                            <>
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Engelle
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
