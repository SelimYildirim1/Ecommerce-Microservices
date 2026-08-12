"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNewsletterSubscriber,
  exportNewsletterCsv,
  getNewsletterSubscribers,
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

export default function NewsletterPage() {
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: () => getNewsletterSubscribers(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNewsletterSubscriber,
    onSuccess: () => {
      toast.success("Abone silindi.");
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportNewsletterCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV indirildi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CSV indirilemedi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Bülten Aboneleri</h1>
        <Button variant="outline" onClick={downloadCsv}>
          CSV indir
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : subscribers.length === 0 ? (
        <p className="text-muted-foreground">Henüz abone yok.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-posta</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Kayıt</TableHead>
              <TableHead>Onay</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.email}</TableCell>
                <TableCell>
                  {s.unsubscribedAt
                    ? "Ayrıldı"
                    : s.isConfirmed
                      ? "Aktif"
                      : "Bekliyor"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(s.createdAt).toLocaleString("tr-TR")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {s.confirmedAt
                    ? new Date(s.confirmedAt).toLocaleString("tr-TR")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Silinsin mi?")) deleteMutation.mutate(s.id);
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
