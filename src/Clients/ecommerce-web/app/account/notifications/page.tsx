"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/client-api";
import type { NotificationPreferences } from "@/lib/client-api";
import { Bell } from "lucide-react";
import { notify } from "@/lib/feedback";

const PREF_ITEMS: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "orderUpdates",
    label: "Sipariş güncellemeleri",
    description: "Sipariş durumu değiştiğinde e-posta / uygulama bildirimi alın",
  },
  {
    key: "stockAlerts",
    label: "Stok bildirimleri",
    description: "Takip ettiğiniz ürün stoka geldiğinde veya tükenmek üzereyken haber verin",
  },
  {
    key: "priceDrops",
    label: "İndirim ve fiyat düşüşü",
    description: "Favori veya ilgilendiğiniz ürünlerde indirim olduğunda bildirim alın",
  },
  {
    key: "campaigns",
    label: "Kampanyalar",
    description: "Özel kampanya, kupon ve fırsatlardan haberdar olun",
  },
  {
    key: "newsletter",
    label: "E-posta bülteni",
    description: "Haftalık ürün ve içerik bülteni alın",
  },
  {
    key: "sms",
    label: "SMS bildirimleri",
    description: "Sipariş ve kritik kampanya bildirimleri SMS ile gelsin",
  },
];

const DEFAULT_PREFS: NotificationPreferences = {
  orderUpdates: true,
  campaigns: true,
  newsletter: true,
  sms: false,
  stockAlerts: true,
  priceDrops: true,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getNotificationPreferences();
        if (!cancelled) {
          setPrefs({
            ...DEFAULT_PREFS,
            ...data,
            stockAlerts: data.stockAlerts ?? true,
            priceDrops: data.priceDrops ?? true,
          });
        }
      } catch {
        /* defaults */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const toggle = async (key: keyof NotificationPreferences) => {
    const previous = prefs;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await updateNotificationPreferences(updated);
      notify.success("Bildirim izinleri güncellendi.");
    } catch {
      setPrefs(previous);
      notify.error("İzinler kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-12 text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bildirim İzinleri</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hangi durumlarda size haber verileceğini seçin. İstediğiniz zaman
          değiştirebilirsiniz.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-4">
          <Bell className="h-5 w-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            İzinler
          </h3>
        </div>
        <div className="divide-y divide-border">
          {PREF_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between p-5 transition hover:bg-muted/20"
            >
              <div className="pr-4">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[item.key]}
                disabled={saving}
                onClick={() => void toggle(item.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  prefs[item.key] ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    prefs[item.key] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
