"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerNote,
  getCustomer,
  getCustomerNotes,
  getCustomers,
  getOrders,
  setCustomerBlocked,
  type Order,
} from "@/lib/api";
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const pageSize = 25;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["customers", debouncedSearch, page],
    queryFn: () => getCustomers(debouncedSearch || undefined, page, pageSize),
  });

  const customers = pageData?.items ?? [];
  const totalPages = pageData?.totalPages ?? 1;

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<Order[]> => {
      const result = await getOrders();
      return Array.isArray(result) ? result : result.items ?? [];
    },
  });

  const orders = ordersData ?? [];

  const { data: detail } = useQuery({
    queryKey: ["customer", selectedId],
    queryFn: () => getCustomer(selectedId!),
    enabled: Boolean(selectedId),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["customer-notes", selectedId],
    queryFn: () => getCustomerNotes(selectedId!),
    enabled: Boolean(selectedId),
  });

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
    [orders, selectedId],
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

  const addNote = useMutation({
    mutationFn: () =>
      createCustomerNote({
        userId: selectedId!,
        note: noteText,
      }),
    onSuccess: () => {
      toast.success("Not eklendi.");
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["customer-notes", selectedId] });
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
            Müşteriler ({pageData?.total ?? 0})
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
            <>
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
                  {customers.map((customer) => {
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
                          <p className="text-xs text-muted-foreground">
                            {customer.userName}
                          </p>
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
                              title={
                                customer.isBlocked ? "Engeli kaldır" : "Hesabı engelle"
                              }
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
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Sayfa {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Önceki
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Müşteri detayı</DialogTitle>
          </DialogHeader>
          {!detail ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Ad: </span>
                  {detail.firstName} {detail.lastName}
                </p>
                <p>
                  <span className="text-muted-foreground">E-posta: </span>
                  {detail.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Telefon: </span>
                  {detail.phoneNumber || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Kayıt: </span>
                  {formatDate(detail.createdAt)}
                </p>
              </div>

              {detail.addresses?.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-sm font-medium">
                    <MapPin className="h-4 w-4" /> Adresler
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {detail.addresses.map((a) => (
                      <li key={a.id} className="rounded border p-2">
                        <strong>{a.addressTitle}</strong> — {a.recipientName}
                        <br />
                        {a.street}, {a.district}/{a.city}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Siparişler</p>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sipariş yok.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {customerOrders.slice(0, 8).map((o) => (
                      <li key={o.id} className="flex justify-between">
                        <span>
                          {ORDER_STATUS_MAP[o.orderStatus]?.label ?? o.orderStatus}
                        </span>
                        <span>{formatCurrency(o.totalAmount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Admin notları</p>
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Not ekle..."
                  />
                  <Button
                    disabled={!noteText.trim() || addNote.isPending}
                    onClick={() => addNote.mutate()}
                  >
                    Ekle
                  </Button>
                </div>
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded border p-2 text-sm">
                      <p>{n.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(n.createdAt)}
                        {n.createdByName ? ` · ${n.createdByName}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
