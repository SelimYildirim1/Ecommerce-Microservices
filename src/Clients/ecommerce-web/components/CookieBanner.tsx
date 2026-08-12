"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  // Eski "accepted" / "rejected" değerleri
  if (raw === "accepted") {
    return {
      necessary: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date().toISOString(),
    };
  }
  if (raw === "rejected") {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed.analytics === "boolean" && typeof parsed.marketing === "boolean") {
      return {
        necessary: true,
        analytics: parsed.analytics,
        marketing: parsed.marketing,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveConsent(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      if (!parseConsent(localStorage.getItem(STORAGE_KEY))) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  const apply = (next: { analytics: boolean; marketing: boolean }) => {
    const consent: CookieConsent = {
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: new Date().toISOString(),
    };
    try {
      saveConsent(consent);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="mx-auto max-w-[1600px] space-y-3 px-4 md:px-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <p className="text-sm text-gray-600 md:max-w-2xl">
            Deneyiminizi iyileştirmek için çerez kullanıyoruz. Zorunlu çerezler her zaman
            aktiftir; analitik ve pazarlama çerezlerini seçebilirsiniz. Detaylar için{" "}
            <Link href="/pages/cerez-politikasi" className="underline">
              çerez politikası
            </Link>
            .
          </p>
          {!customize && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => apply({ analytics: false, marketing: false })}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Sadece zorunlu
              </button>
              <button
                type="button"
                onClick={() => setCustomize(true)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Özelleştir
              </button>
              <button
                type="button"
                onClick={() => apply({ analytics: true, marketing: true })}
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-white"
              >
                Tümünü kabul et
              </button>
            </div>
          )}
        </div>

        {customize && (
          <div className="space-y-3 rounded-lg border border-border p-3 md:max-w-lg">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Zorunlu</span>
                <span className="block text-xs text-muted-foreground">
                  Site çalışması için gerekli
                </span>
              </span>
              <input type="checkbox" checked disabled className="h-4 w-4" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Analitik</span>
                <span className="block text-xs text-muted-foreground">
                  Kullanım istatistikleri
                </span>
              </span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Pazarlama</span>
                <span className="block text-xs text-muted-foreground">
                  Kişiselleştirilmiş reklam / bülten
                </span>
              </span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomize(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={() => apply({ analytics, marketing })}
                className="rounded-lg bg-foreground px-4 py-2 text-sm text-white"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
