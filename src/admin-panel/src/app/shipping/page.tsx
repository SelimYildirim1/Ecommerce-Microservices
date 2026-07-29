"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SHIPMENT_STATUS_LABELS,
  createCarrier,
  createRate,
  deleteCarrier,
  deleteRate,
  dispatchShipment,
  getCarriers,
  getShipments,
  getShippingSettings,
  updateCarrier,
  updateRate,
  updateShipment,
  updateShippingSettings,
} from "@/lib/api";
import type {
  Carrier,
  CarrierPayload,
  RatePayload,
  ShipmentStatus,
  ShippingSettings,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Pencil, Plus, Send, Settings2, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const SHIPMENT_STATUSES = Object.keys(SHIPMENT_STATUS_LABELS) as ShipmentStatus[];

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const emptyCarrier = (): CarrierPayload => ({
  name: "",
  code: "",
  logoUrl: "",
  trackingUrlTemplate: "",
  estimatedDays: 3,
  isActive: true,
});

const emptyRate = (): RatePayload => ({
  minDesi: 0,
  maxDesi: 100,
  minBasketAmount: 0,
  maxBasketAmount: 0,
  price: 0,
  isActive: true,
});

export default function ShippingPage() {
  const queryClient = useQueryClient();

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["carriers"],
    queryFn: getCarriers,
  });

  const [shipmentFilter, setShipmentFilter] = useState<string>("");

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ["shipments", shipmentFilter],
    queryFn: () => getShipments(shipmentFilter || undefined),
  });

  const { data: settings } = useQuery({
    queryKey: ["shipping-settings"],
    queryFn: getShippingSettings,
  });

  const [carrierDraft, setCarrierDraft] = useState<(CarrierPayload & { id?: string }) | null>(
    null
  );
  const [rateDraft, setRateDraft] = useState<
    (RatePayload & { carrierId: string; id?: string }) | null
  >(null);
  const [settingsDraft, setSettingsDraft] = useState<ShippingSettings | null>(null);

  useEffect(() => {
    if (settings) setSettingsDraft(settings);
  }, [settings]);

  const invalidateCarriers = () =>
    queryClient.invalidateQueries({ queryKey: ["carriers"] });
  const invalidateShipments = () =>
    queryClient.invalidateQueries({ queryKey: ["shipments"] });

  const saveCarrier = useMutation({
    mutationFn: ({ id, ...payload }: CarrierPayload & { id?: string }) =>
      id ? updateCarrier(id, payload) : createCarrier(payload).then(() => undefined),
    onSuccess: () => {
      toast.success("Kargo firması kaydedildi.");
      setCarrierDraft(null);
      invalidateCarriers();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCarrier = useMutation({
    mutationFn: deleteCarrier,
    onSuccess: () => {
      toast.success("Kargo firması silindi.");
      invalidateCarriers();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveRate = useMutation({
    mutationFn: ({ carrierId, id, ...payload }: RatePayload & { carrierId: string; id?: string }) =>
      id ? updateRate(id, payload) : createRate(carrierId, payload).then(() => undefined),
    onSuccess: () => {
      toast.success("Fiyat kuralı kaydedildi.");
      setRateDraft(null);
      invalidateCarriers();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRate = useMutation({
    mutationFn: deleteRate,
    onSuccess: () => {
      toast.success("Fiyat kuralı silindi.");
      invalidateCarriers();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSettings = useMutation({
    mutationFn: updateShippingSettings,
    onSuccess: () => {
      toast.success("Kargo ayarları güncellendi.");
      queryClient.invalidateQueries({ queryKey: ["shipping-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dispatch = useMutation({
    mutationFn: dispatchShipment,
    onSuccess: (shipment) => {
      toast.success(`Kargoya verildi. Takip no: ${shipment.trackingNumber}`);
      invalidateShipments();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ShipmentStatus }) =>
      updateShipment(id, { status }),
    onSuccess: () => {
      toast.success("Gönderi durumu güncellendi.");
      invalidateShipments();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editCarrier = (carrier: Carrier) =>
    setCarrierDraft({
      id: carrier.id,
      name: carrier.name,
      code: carrier.code,
      logoUrl: carrier.logoUrl ?? "",
      trackingUrlTemplate: carrier.trackingUrlTemplate ?? "",
      estimatedDays: carrier.estimatedDays,
      isActive: carrier.isActive,
    });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kargo Yönetimi</h1>

      <Tabs defaultValue="carriers">
        <TabsList>
          <TabsTrigger value="carriers">
            <Truck className="mr-2 h-4 w-4" /> Firmalar ve Fiyatlar
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Package className="mr-2 h-4 w-4" /> Gönderiler
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-2 h-4 w-4" /> Ayarlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carriers" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCarrierDraft(emptyCarrier())}>
              <Plus className="mr-2 h-4 w-4" /> Yeni Kargo Firması
            </Button>
          </div>

          {carriersLoading && <p className="text-muted-foreground">Yükleniyor...</p>}

          {carriers.map((carrier) => (
            <Card key={carrier.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {carrier.name}
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {carrier.code}
                    </span>
                    {!carrier.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Pasif
                      </span>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tahmini teslim: {carrier.estimatedDays} gün
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRateDraft({ ...emptyRate(), carrierId: carrier.id })}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Kural
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => editCarrier(carrier)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`"${carrier.name}" silinecek. Emin misiniz?`)) {
                        removeCarrier.mutate(carrier.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Desi Aralığı</TableHead>
                      <TableHead>Sepet Aralığı</TableHead>
                      <TableHead>Ücret</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrier.rates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          {rate.minDesi} - {rate.maxDesi} desi
                        </TableCell>
                        <TableCell>
                          {money(rate.minBasketAmount)} -{" "}
                          {rate.maxBasketAmount > 0 ? money(rate.maxBasketAmount) : "∞"}
                        </TableCell>
                        <TableCell className="font-medium">{money(rate.price)}</TableCell>
                        <TableCell>{rate.isActive ? "Aktif" : "Pasif"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setRateDraft({
                                  id: rate.id,
                                  carrierId: carrier.id,
                                  minDesi: rate.minDesi,
                                  maxDesi: rate.maxDesi,
                                  minBasketAmount: rate.minBasketAmount,
                                  maxBasketAmount: rate.maxBasketAmount,
                                  price: rate.price,
                                  isActive: rate.isActive,
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRate.mutate(rate.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {carrier.rates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Fiyat kuralı yok — varsayılan ücret uygulanır
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="shipments" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Gönderiler ({shipments.length})</CardTitle>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={shipmentFilter}
                onChange={(e) => setShipmentFilter(e.target.value)}
              >
                <option value="">Tüm durumlar</option>
                {SHIPMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SHIPMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <p className="text-muted-foreground">Yükleniyor...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sipariş</TableHead>
                      <TableHead>Alıcı</TableHead>
                      <TableHead>Firma</TableHead>
                      <TableHead>Takip No</TableHead>
                      <TableHead>Ücret</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-xs">{shipment.orderId}</TableCell>
                        <TableCell>{shipment.recipientName || shipment.userName || "-"}</TableCell>
                        <TableCell>{shipment.carrierName || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {shipment.trackingUrl ? (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {shipment.trackingNumber}
                            </a>
                          ) : (
                            shipment.trackingNumber || "-"
                          )}
                        </TableCell>
                        <TableCell>{money(shipment.shippingCost)}</TableCell>
                        <TableCell>
                          <select
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                            value={shipment.status}
                            onChange={(e) =>
                              changeStatus.mutate({
                                id: shipment.id,
                                status: e.target.value as ShipmentStatus,
                              })
                            }
                          >
                            {SHIPMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {SHIPMENT_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          {!shipment.trackingNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={dispatch.isPending}
                              onClick={() => dispatch.mutate(shipment.id)}
                            >
                              <Send className="mr-1 h-3 w-3" /> Kargoya Ver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {shipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Gönderi kaydı yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Genel Kargo Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsDraft && (
                <>
                  <div className="grid max-w-xl grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ücretsiz Kargo Eşiği (₺)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settingsDraft.freeShippingThreshold}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            freeShippingThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Varsayılan Ücret (₺)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settingsDraft.defaultPrice}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            defaultPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ürün Başı Desi</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={settingsDraft.defaultDesiPerItem}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            defaultDesiPerItem: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Sepet tutarı ücretsiz kargo eşiğini geçtiğinde tüm firmalar için kargo
                    ücreti sıfırlanır.
                  </p>

                  <Button
                    disabled={saveSettings.isPending}
                    onClick={() => saveSettings.mutate(settingsDraft)}
                  >
                    {saveSettings.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Kargo firmasi formu */}
      <Dialog
        open={carrierDraft !== null}
        onOpenChange={(open) => !open && setCarrierDraft(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {carrierDraft?.id ? "Kargo Firmasını Düzenle" : "Yeni Kargo Firması"}
            </DialogTitle>
          </DialogHeader>

          {carrierDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Firma Adı</Label>
                  <Input
                    value={carrierDraft.name}
                    onChange={(e) =>
                      setCarrierDraft({ ...carrierDraft, name: e.target.value })
                    }
                    placeholder="Aras Kargo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kod</Label>
                  <Input
                    value={carrierDraft.code}
                    disabled={Boolean(carrierDraft.id)}
                    onChange={(e) =>
                      setCarrierDraft({ ...carrierDraft, code: e.target.value.toUpperCase() })
                    }
                    placeholder="ARAS"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Takip URL Şablonu</Label>
                <Input
                  value={carrierDraft.trackingUrlTemplate ?? ""}
                  onChange={(e) =>
                    setCarrierDraft({ ...carrierDraft, trackingUrlTemplate: e.target.value })
                  }
                  placeholder="https://kargotakip.example.com/?no={trackingNumber}"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tahmini Teslim (gün)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={carrierDraft.estimatedDays}
                    onChange={(e) =>
                      setCarrierDraft({
                        ...carrierDraft,
                        estimatedDays: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={carrierDraft.isActive}
                    onChange={(e) =>
                      setCarrierDraft({ ...carrierDraft, isActive: e.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierDraft(null)}>
              İptal
            </Button>
            <Button
              disabled={
                !carrierDraft?.name.trim() ||
                !carrierDraft?.code.trim() ||
                saveCarrier.isPending
              }
              onClick={() => carrierDraft && saveCarrier.mutate(carrierDraft)}
            >
              {saveCarrier.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fiyat kurali formu */}
      <Dialog open={rateDraft !== null} onOpenChange={(open) => !open && setRateDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{rateDraft?.id ? "Kuralı Düzenle" : "Yeni Fiyat Kuralı"}</DialogTitle>
          </DialogHeader>

          {rateDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min. Desi</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={rateDraft.minDesi}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, minDesi: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maks. Desi</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={rateDraft.maxDesi}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, maxDesi: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min. Sepet (₺)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateDraft.minBasketAmount}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, minBasketAmount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maks. Sepet (0 = sınırsız)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateDraft.maxBasketAmount}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, maxBasketAmount: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ücret (₺)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateDraft.price}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, price: Number(e.target.value) })
                    }
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rateDraft.isActive}
                    onChange={(e) =>
                      setRateDraft({ ...rateDraft, isActive: e.target.checked })
                    }
                  />
                  Aktif
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDraft(null)}>
              İptal
            </Button>
            <Button
              disabled={saveRate.isPending}
              onClick={() => rateDraft && saveRate.mutate(rateDraft)}
            >
              {saveRate.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}