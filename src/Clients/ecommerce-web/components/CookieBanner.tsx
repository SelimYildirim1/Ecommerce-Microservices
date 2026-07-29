"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between md:px-12">
        <p className="text-sm text-gray-600">
          Deneyiminizi iyileştirmek için çerez kullanıyoruz. Detaylar için{" "}
          <Link href="/pages/cerez-politikasi" className="underline">
            çerez politikası
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-white"
          >
            Kabul et
          </button>
        </div>
      </div>
    </div>
  );
}
