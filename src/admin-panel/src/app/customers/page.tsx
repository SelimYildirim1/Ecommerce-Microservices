"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomer, getCustomers, getOrders, setCustomerBlocked } from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { Ban, MapPin, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomers(),
  });

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: getOrders });

  const { data: detail } = useQuery({
    queryKey: ["customer", selectedId],
    queryFn: () => getCustomer(selectedId!),
    enabled: Boolean(selectedId),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      [c.userName, c.email, c.firstName, c.lastName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term))
    );
  }, [customers, search]);

  /** Musteri bazinda siparis sayisi ve toplam harcama. */
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const order of orders) {
      const current = map.get(order.buyerId) ?? { count: 0, total: 0 };
      map.set(order.buyerId, {
        count: current.count + 1,
        total: current.total + order.totalAmount,
      });
    }
    return map;
  }, [orders]);

  const customerOrders = useMemo(
    () => (selectedId ? orders.filter((o) => o.buyerId === selectedId) : []),
    [orders, selectedId]
  );

  const toggleBlock = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      setCustomerBlocked(id, blocked),
    onSuccess: (_, variables) => {
      toast.success(variables.blocked ? "Hesap engellendi." : "Engel kaldırıldı.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Müşteri Yönetimi</h1>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Müşteriler ({filtered.length})
          </CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, kullanıcı adı veya e-posta ara"
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
                  <TableHead>Müşteri</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Toplam Harcama</TableHead>
                  <TableHead>Kayıt</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => {
                  const stat = stats.get(customer.id) ?? { count: 0, total: 0 };
                  const fullName =
                    `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
                    customer.userName;

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => setSelectedId(customer.id)}
                        >
                          {fullName}
                        </button>
                        <p className="text-xs text-muted-foreground">{customer.userName}</p>
                      </TableCell>
                      <TableCell className="text-sm">{customer.email}</TableCell>
                      <TableCell>
                        {customer.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === "Admin" ? "default" : "outline"}
                            className="mr-1"
                          >
                            {role}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(stat.total)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell>
                        {customer.isBlocked ? (
                          <Badge variant="destructive">Engelli</Badge>
                        ) : (
                          <Badge variant="outline">Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={customer.isBlocked ? "Engeli kaldır" : "Hesabı engelle"}
                            disabled={toggleBlock.isPending}
                            onClick={() =>
                              toggleBlock.mutate({
                                id: customer.id,
                                blocked: !customer.isBlocked,
                              })
                            }
                          >
                            {customer.isBlocked ? (
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Müşteri bulunamadı
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail
                ? `${detail.firstName ?? ""} ${detail.lastName ?? ""}`.trim() || detail.userName
                : "Müşteri Detayı"}
            </DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="E-posta" value={detail.email} />
                <Info label="Kullanıcı adı" value={detail.userName} />
                <Info label="Telefon" value={detail.phoneNumber || "-"} />
                <Info label="Kayıt tarihi" value={formatDate(detail.createdAt)} />
                <Info label="Roller" value={detail.roles.join(", ") || "-"} />
                <Info label="Durum" value={detail.isBlocked ? "Engelli" : "Aktif"} />
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  Adres Defteri ({detail.addresses.length})
                </h3>
                {detail.addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Kayıtlı adres yok.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.addresses.map((address) => (
                      <div key={address.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{address.addressTitle}</span>
                          {address.isDefault && <Badge variant="outline">Varsayılan</Badge>}
                        </div>
                        <p className="text-muted-foreground">
                          {address.recipientName} — {address.phoneNumber}
                        </p>
                        <p className="text-muted-foreground">
                          {address.street}, {address.district} / {address.city}{" "}
                          {address.zipCode}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Sipariş Geçmişi ({customerOrders.length})
                </h3>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sipariş yok.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Kalem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerOrders.map((order) => {
                        const status = ORDER_STATUS_MAP[order.orderStatus] ?? {
                          label: order.orderStatus,
                          variant: "secondary" as const,
                        };
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="text-sm">
                              {formatDate(order.orderDate)}
                            </TableCell>
                            <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>{order.orderItems?.length ?? 0}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Yükleniyor...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
