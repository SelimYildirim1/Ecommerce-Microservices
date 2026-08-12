"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLoyaltyAccount, getUserCoupons } from "@/lib/client-api";
import type { LoyaltyAccount, UserCoupon } from "@/lib/client-api";
import { Star, Ticket } from "lucide-react";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

export default function CouponsPage() {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const [loyaltyData, couponData] = await Promise.all([
          getLoyaltyAccount(user.id),
          getUserCoupons(user.id),
        ]);
        if (!cancelled) {
          setLoyalty(loyaltyData);
          setCoupons(couponData);
        }
      } catch {
        /* opsiyonel */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <p className="text-muted-foreground py-12">Yükleniyor...</p>;

  const available = coupons.filter((c) => !c.used);
  const used = coupons.filter((c) => c.used);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center gap-3">
          <Star className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Sadakat Puanlarım</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Her siparişte puan kazanın</p>
          </div>
        </div>
        <div className="p-5">
          <div className="text-3xl font-bold">{loyalty?.points ?? 0} <span className="text-base font-medium text-muted-foreground">puan</span></div>

          {loyalty && loyalty.transactions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Son İşlemler</h3>
              {loyalty.transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{t.description || (t.type === "Earn" ? "Puan kazanımı" : "Puan kullanımı")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <span className={`font-medium ${t.type === "Earn" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "Earn" ? "+" : "-"}{t.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center gap-3">
          <Ticket className="h-5 w-5 text-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Kuponlarım</h2>
        </div>
        <div className="p-5 space-y-6">
          {available.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kullanılabilir</h3>
              {available.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="font-mono font-medium text-sm">{c.code}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description || `${c.discountType === "Percentage" ? `%${c.value}` : formatPrice(c.value)} indirim`}</p>
                    {c.minBasketAmount > 0 && <p className="text-xs text-muted-foreground">Min. sepet: {formatPrice(c.minBasketAmount)}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.validTo).toLocaleDateString("tr-TR")}&#39;e kadar
                  </span>
                </div>
              ))}
            </div>
          )}

          {used.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kullanılmış</h3>
              {used.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-4 opacity-50">
                  <div>
                    <p className="font-mono font-medium text-sm line-through">{c.code}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description || `${c.discountType === "Percentage" ? `%${c.value}` : formatPrice(c.value)} indirim`}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Kullanıldı</span>
                </div>
              ))}
            </div>
          )}

          {available.length === 0 && used.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Henüz kuponunuz bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
