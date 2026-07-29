"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DISCOUNT_TYPE_LABELS,
  createCampaign,
  createCoupon,
  deleteCampaign,
  deleteCoupon,
  getCampaigns,
  getCoupons,
  updateCampaign,
  updateCoupon,
} from "@/lib/api";
import type {
  Campaign,
  CampaignPayload,
  Coupon,
  CouponPayload,
  DiscountType,
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
import { BadgePercent, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const DISCOUNT_TYPES: DiscountType[] = ["Percentage", "FixedAmount", "FreeShipping"];

const toDateInput = (iso: string) => iso.slice(0, 10);
const fromDateInput = (value: string) => new Date(`${value}T00:00:00Z`).toISOString();

const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const formatDiscount = (type: DiscountType, value: number) =>
  type === "Percentage" ? `%${value}` : type === "FixedAmount" ? money(value) : "Kargo bedava";

const isExpired = (validTo: string) => new Date(validTo) < new Date();

function emptyCoupon(): CouponPayload {
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    description: "",
    discountType: "Percentage",
    value: 10,
    minBasketAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    perUserLimit: 1,
    validFrom: now.toISOString(),
    validTo: end.toISOString(),
    isActive: true,
    categoryIds: "",
    productIds: "",
  };
}

function emptyCampaign(): CampaignPayload {
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    name: "",
    description: "",
    discountType: "Percentage",
    value: 10,
    minBasketAmount: 0,
    maxDiscountAmount: 0,
    validFrom: now.toISOString(),
    validTo: end.toISOString(),
    isActive: true,
    categoryIds: "",
    productIds: "",
    priority: 0,
  };
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: getCoupons,
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });

  const [couponDraft, setCouponDraft] = useState<(CouponPayload & { id?: string }) | null>(
    null
  );
  const [campaignDraft, setCampaignDraft] = useState<
    (CampaignPayload & { id?: string }) | null
  >(null);

  const saveCoupon = useMutation({
    mutationFn: ({ id, ...payload }: CouponPayload & { id?: string }) =>
      id ? updateCoupon(id, payload) : createCoupon(payload).then(() => undefined),
    onSuccess: () => {
      toast.success("Kupon kaydedildi.");
      setCouponDraft(null);
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCoupon = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      toast.success("Kupon silindi.");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveCampaign = useMutation({
    mutationFn: ({ id, ...payload }: CampaignPayload & { id?: string }) =>
      id ? updateCampaign(id, payload) : createCampaign(payload).then(() => undefined),
    onSuccess: () => {
      toast.success("Kampanya kaydedildi.");
      setCampaignDraft(null);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCampaign = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast.success("Kampanya silindi.");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editCoupon = (coupon: Coupon) =>
    setCouponDraft({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? "",
      discountType: coupon.discountType,
      value: coupon.value,
      minBasketAmount: coupon.minBasketAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      isActive: coupon.isActive,
      categoryIds: coupon.categoryIds ?? "",
      productIds: coupon.productIds ?? "",
    });

  const editCampaign = (campaign: Campaign) =>
    setCampaignDraft({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? "",
      discountType: campaign.discountType,
      value: campaign.value,
      minBasketAmount: campaign.minBasketAmount,
      maxDiscountAmount: campaign.maxDiscountAmount,
      validFrom: campaign.validFrom,
      validTo: campaign.validTo,
      isActive: campaign.isActive,
      categoryIds: campaign.categoryIds ?? "",
      productIds: campaign.productIds ?? "",
      priority: campaign.priority,
    });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kupon ve Kampanya</h1>

      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons">
            <BadgePercent className="mr-2 h-4 w-4" /> Kuponlar
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Megaphone className="mr-2 h-4 w-4" /> Kampanyalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Kuponlar ({coupons.length})</CardTitle>
              <Button onClick={() => setCouponDraft(emptyCoupon())}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Kupon
              </Button>
            </CardHeader>
            <CardContent>
              {couponsLoading ? (
                <p className="text-muted-foreground">Yükleniyor...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>İndirim</TableHead>
                      <TableHead>Min. Sepet</TableHead>
                      <TableHead>Kullanım</TableHead>
                      <TableHead>Geçerlilik</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                        <TableCell>
                          {formatDiscount(coupon.discountType, coupon.value)}
                        </TableCell>
                        <TableCell>
                          {coupon.minBasketAmount > 0 ? money(coupon.minBasketAmount) : "-"}
                        </TableCell>
                        <TableCell>
                          {coupon.usedCount}
                          {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ""}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {toDateInput(coupon.validFrom)} → {toDateInput(coupon.validTo)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            active={coupon.isActive && !isExpired(coupon.validTo)}
                            label={
                              !coupon.isActive
                                ? "Pasif"
                                : isExpired(coupon.validTo)
                                  ? "Süresi doldu"
                                  : "Aktif"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Düzenle"
                              onClick={() => editCoupon(coupon)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sil"
                              onClick={() => {
                                if (confirm(`"${coupon.code}" silinecek. Emin misiniz?`)) {
                                  removeCoupon.mutate(coupon.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {coupons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Henüz kupon oluşturulmamış
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Kampanyalar ({campaigns.length})</CardTitle>
              <Button onClick={() => setCampaignDraft(emptyCampaign())}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Kampanya
              </Button>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <p className="text-muted-foreground">Yükleniyor...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ad</TableHead>
                      <TableHead>İndirim</TableHead>
                      <TableHead>Min. Sepet</TableHead>
                      <TableHead>Öncelik</TableHead>
                      <TableHead>Geçerlilik</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          {formatDiscount(campaign.discountType, campaign.value)}
                        </TableCell>
                        <TableCell>
                          {campaign.minBasketAmount > 0
                            ? money(campaign.minBasketAmount)
                            : "-"}
                        </TableCell>
                        <TableCell>{campaign.priority}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {toDateInput(campaign.validFrom)} → {toDateInput(campaign.validTo)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            active={campaign.isActive && !isExpired(campaign.validTo)}
                            label={
                              !campaign.isActive
                                ? "Pasif"
                                : isExpired(campaign.validTo)
                                  ? "Süresi doldu"
                                  : "Aktif"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Düzenle"
                              onClick={() => editCampaign(campaign)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sil"
                              onClick={() => {
                                if (confirm(`"${campaign.name}" silinecek. Emin misiniz?`)) {
                                  removeCampaign.mutate(campaign.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {campaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Henüz kampanya oluşturulmamış
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Kupon formu */}
      <Dialog
        open={couponDraft !== null}
        onOpenChange={(open) => !open && setCouponDraft(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{couponDraft?.id ? "Kuponu Düzenle" : "Yeni Kupon"}</DialogTitle>
          </DialogHeader>

          {couponDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kupon Kodu">
                  <Input
                    value={couponDraft.code}
                    onChange={(e) =>
                      setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() })
                    }
                    placeholder="HOSGELDIN10"
                    className="font-mono"
                  />
                </Field>
                <Field label="İndirim Tipi">
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={couponDraft.discountType}
                    onChange={(e) =>
                      setCouponDraft({
                        ...couponDraft,
                        discountType: e.target.value as DiscountType,
                      })
                    }
                  >
                    {DISCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DISCOUNT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Açıklama">
                <Input
                  value={couponDraft.description ?? ""}
                  onChange={(e) =>
                    setCouponDraft({ ...couponDraft, description: e.target.value })
                  }
                  placeholder="İlk siparişe özel"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field
                  label={couponDraft.discountType === "Percentage" ? "Oran (%)" : "Tutar (₺)"}
                >
                  <Input
                    type="number"
                    min={0}
                    disabled={couponDraft.discountType === "FreeShipping"}
                    value={couponDraft.value}
                    onChange={(e) =>
                      setCouponDraft({ ...couponDraft, value: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Min. Sepet (₺)">
                  <Input
                    type="number"
                    min={0}
                    value={couponDraft.minBasketAmount}
                    onChange={(e) =>
                      setCouponDraft({
                        ...couponDraft,
                        minBasketAmount: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Maks. İndirim (₺)">
                  <Input
                    type="number"
                    min={0}
                    value={couponDraft.maxDiscountAmount}
                    onChange={(e) =>
                      setCouponDraft({
                        ...couponDraft,
                        maxDiscountAmount: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Toplam Kullanım Limiti (0 = sınırsız)">
                  <Input
                    type="number"
                    min={0}
                    value={couponDraft.usageLimit}
                    onChange={(e) =>
                      setCouponDraft({ ...couponDraft, usageLimit: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Kişi Başı Limit">
                  <Input
                    type="number"
                    min={0}
                    value={couponDraft.perUserLimit}
                    onChange={(e) =>
                      setCouponDraft({ ...couponDraft, perUserLimit: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç">
                  <Input
                    type="date"
                    value={toDateInput(couponDraft.validFrom)}
                    onChange={(e) =>
                      setCouponDraft({
                        ...couponDraft,
                        validFrom: fromDateInput(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Bitiş">
                  <Input
                    type="date"
                    value={toDateInput(couponDraft.validTo)}
                    onChange={(e) =>
                      setCouponDraft({
                        ...couponDraft,
                        validTo: fromDateInput(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={couponDraft.isActive}
                  onChange={(e) =>
                    setCouponDraft({ ...couponDraft, isActive: e.target.checked })
                  }
                />
                Aktif
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponDraft(null)}>
              İptal
            </Button>
            <Button
              disabled={!couponDraft?.code.trim() || saveCoupon.isPending}
              onClick={() => couponDraft && saveCoupon.mutate(couponDraft)}
            >
              {saveCoupon.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kampanya formu */}
      <Dialog
        open={campaignDraft !== null}
        onOpenChange={(open) => !open && setCampaignDraft(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {campaignDraft?.id ? "Kampanyayı Düzenle" : "Yeni Kampanya"}
            </DialogTitle>
          </DialogHeader>

          {campaignDraft && (
            <div className="space-y-4">
              <Field label="Kampanya Adı">
                <Input
                  value={campaignDraft.name}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, name: e.target.value })
                  }
                  placeholder="500 TL üzeri kargo bedava"
                />
              </Field>

              <Field label="Açıklama">
                <Input
                  value={campaignDraft.description ?? ""}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, description: e.target.value })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="İndirim Tipi">
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={campaignDraft.discountType}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        discountType: e.target.value as DiscountType,
                      })
                    }
                  >
                    {DISCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DISCOUNT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={
                    campaignDraft.discountType === "Percentage" ? "Oran (%)" : "Tutar (₺)"
                  }
                >
                  <Input
                    type="number"
                    min={0}
                    disabled={campaignDraft.discountType === "FreeShipping"}
                    value={campaignDraft.value}
                    onChange={(e) =>
                      setCampaignDraft({ ...campaignDraft, value: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Min. Sepet (₺)">
                  <Input
                    type="number"
                    min={0}
                    value={campaignDraft.minBasketAmount}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        minBasketAmount: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Maks. İndirim (₺)">
                  <Input
                    type="number"
                    min={0}
                    value={campaignDraft.maxDiscountAmount}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        maxDiscountAmount: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Öncelik">
                  <Input
                    type="number"
                    value={campaignDraft.priority}
                    onChange={(e) =>
                      setCampaignDraft({ ...campaignDraft, priority: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç">
                  <Input
                    type="date"
                    value={toDateInput(campaignDraft.validFrom)}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        validFrom: fromDateInput(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Bitiş">
                  <Input
                    type="date"
                    value={toDateInput(campaignDraft.validTo)}
                    onChange={(e) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        validTo: fromDateInput(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={campaignDraft.isActive}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, isActive: e.target.checked })
                  }
                />
                Aktif
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDraft(null)}>
              İptal
            </Button>
            <Button
              disabled={!campaignDraft?.name.trim() || saveCampaign.isPending}
              onClick={() => campaignDraft && saveCampaign.mutate(campaignDraft)}
            >
              {saveCampaign.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
