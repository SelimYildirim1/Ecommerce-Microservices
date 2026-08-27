"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Akış (streaming) ile gelen sayfalarda tarayıcı, içerik büyüdükçe eski scroll
 * konumuna geri çapa atabiliyor. Bu yüzden tek seferlik scrollTo yetmez;
 * gezinmeden sonra kısa bir süre tekrar denenir.
 */
const RETRY_DELAYS_MS = [0, 60, 180, 400];

/**
 * Yeni bir sayfaya geçildiğinde sayfayı en üste alır.
 *
 * Geri/ileri (popstate) gezinmelerinde tarayıcının kendi scroll geri yükleme
 * davranışına dokunulmaz; kullanıcı kaldığı yerden devam eder. Kullanıcı
 * gezinmeden hemen sonra kendisi kaydırırsa tekrar denemeler iptal edilir.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const isHistoryNav = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const markHistoryNav = () => {
      isHistoryNav.current = true;
    };
    window.addEventListener("popstate", markHistoryNav);
    return () => window.removeEventListener("popstate", markHistoryNav);
  }, []);

  useEffect(() => {
    // İlk yüklemede tarayıcı zaten doğru konumda (deep link, yenileme, #hash).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isHistoryNav.current) {
      isHistoryNav.current = false;
      return;
    }

    // Sayfa içi bağlantıya (#hash) gidiliyorsa hedefi bozmayalım.
    if (window.location.hash) return;

    let cancelled = false;
    const timers: number[] = [];

    const cancel = () => {
      cancelled = true;
    };

    const toTop = () => {
      if (cancelled) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    // Kullanıcı kendisi kaydırmaya başlarsa onu yukarı çekmeyi bırak.
    const userEvents = ["wheel", "touchstart", "keydown", "mousedown"] as const;
    userEvents.forEach((event) =>
      window.addEventListener(event, cancel, { passive: true, once: true }),
    );

    toTop();
    RETRY_DELAYS_MS.forEach((delay) => {
      if (delay === 0) return;
      timers.push(window.setTimeout(toTop, delay));
    });

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      userEvents.forEach((event) => window.removeEventListener(event, cancel));
    };
  }, [pathname]);

  return null;
}
