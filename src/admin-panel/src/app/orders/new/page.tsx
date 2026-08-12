"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createManualOrder,
  getProducts,
  type CreateManualOrderPayload,
  type Product,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type DraftItem = {
  key: string;
  productId: string;
  productName: string;
  unitPrice: number;
  units: number;
  pictureUrl?: string;
};

const PAYMENT_METHODS = [
  { value: "card", label: "Kredi kartı" },
  { value: "bank_transfer", label: "Havale/EFT" },
  { value: "cash_on_delivery", label: "Kapıda ödeme" },
];

function productPrice(p: Product): number {
  const active = p.variants?.find((v) => v.isActive) ?? p.variants?.[0];
  return active?.price ?? 0;
}

export default function NewManualOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("TR");
  const [zipCode, setZipCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [description, setDescription] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [shippingCost, setShippingCost] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [initialStatus, setInitialStatus] = useState("Submitted");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products.slice(0, 20);
    return products
      .filter((p) => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term))
      .slice(0, 20);
  }, [products, productSearch]);

  const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.units, 0);
  const shipping = Number(shippingCost) || 0;
  const discount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, itemsTotal + shipping - discount);

  const mutation = useMutation({
    mutationFn: (payload: CreateManualOrderPayload) => createManualOrder(payload),
    onSuccess: (order) => {
      toast.success("Manuel sipariş oluşturuldu.");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${order.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addProduct = (p: Product) => {
    const price = productPrice(p);
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, units: i.units + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          unitPrice: price,
          units: 1,
          pictureUrl: p.primaryImageUrl,
        },
      ];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("En az bir ürün ekleyin.");
      return;
    }
    mutation.mutate({
      buyerId: buyerId.trim() || null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: emailAddress.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim() || null,
      country: country.trim() || "TR",
      zipCode: zipCode.trim() || null,
      paymentMethod,
      description: description.trim() || null,
      adminNote: adminNote.trim() || null,
      shippingCost: shipping,
      discountAmount: discount,
      initialStatus,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: i.unitPrice,
        units: i.units,
        pictureUrl: i.pictureUrl ?? null,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Manuel Sipariş</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Müşteri</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Ad *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input placeholder="Soyad *" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              <Input
                type="email"
                placeholder="E-posta *"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                required
                className="sm:col-span-2"
              />
              <Input
                placeholder="BuyerId (opsiyonel)"
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="sm:col-span-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Adres</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Adres *"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
                className="sm:col-span-2"
              />
              <Input placeholder="Şehir *" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input placeholder="İlçe / Eyalet" value={state} onChange={(e) => setState(e.target.value)} />
              <Input placeholder="Ülke" value={country} onChange={(e) => setCountry(e.target.value)} />
              <Input placeholder="Posta kodu" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ürünler</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Ürün ara..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50"
                    onClick={() => addProduct(p)}
                  >
                    <span>{p.name}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {formatCurrency(productPrice(p))}
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Ürün bulunamadı</p>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Fiyat</TableHead>
                    <TableHead>Adet</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-28"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.key === item.key
                                  ? { ...i, unitPrice: Number(e.target.value) || 0 }
                                  : i,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={item.units}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.key === item.key
                                  ? { ...i, units: Math.max(1, Number(e.target.value) || 1) }
                                  : i,
                              ),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Henüz ürün eklenmedi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ödeme & Durum</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Ödeme yöntemi</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Başlangıç durumu</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                >
                  <option value="Submitted">Alındı</option>
                  <option value="Paid">Ödendi</option>
                  <option value="Shipped">Kargoda</option>
                  <option value="Delivered">Teslim edildi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Kargo</label>
                <Input type="number" min={0} step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">İndirim</label>
                <Input type="number" min={0} step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>
              <div className="flex justify-between border-t pt-3 text-sm">
                <span>Ara toplam</span>
                <span>{formatCurrency(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Genel toplam</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notlar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Müşteri notu"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <Textarea
                placeholder="Admin notu"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Oluşturuluyor..." : "Siparişi Oluştur"}
          </Button>
        </div>
      </form>
    </div>
  );
}
