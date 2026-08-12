"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteContactMessage,
  getContactMessages,
  markContactMessageRead,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function ContactMessagesPage() {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => getContactMessages(),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => markContactMessageRead(id, true),
    onSuccess: () => {
      toast.success("Okundu olarak işaretlendi.");
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContactMessage,
    onSuccess: () => {
      toast.success("Mesaj silindi.");
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">İletişim Mesajları</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground">Henüz mesaj yok.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Durum</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Konu</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((m) => (
              <TableRow key={m.id} className={m.isRead ? "" : "bg-muted/40"}>
                <TableCell>{m.isRead ? "Okundu" : "Yeni"}</TableCell>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  {m.phone && (
                    <div className="text-xs text-muted-foreground">{m.phone}</div>
                  )}
                </TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>
                  <div className="font-medium">{m.subject}</div>
                  <p className="mt-1 max-w-md whitespace-pre-wrap text-xs text-muted-foreground">
                    {m.message}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(m.createdAt).toLocaleString("tr-TR")}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {!m.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => readMutation.mutate(m.id)}
                    >
                      Okundu
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Silinsin mi?")) deleteMutation.mutate(m.id);
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
