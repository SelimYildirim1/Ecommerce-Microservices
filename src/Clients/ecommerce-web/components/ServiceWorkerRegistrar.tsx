"use client";

import { useEffect } from "react";

/** PWA service worker kaydı — idle sonrası, yalnızca production. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sessiz — SW yoksa vitrin yine çalışır */
      });
    };

    const schedule = () => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number },
          ) => number;
        }
      ).requestIdleCallback;

      if (typeof ric === "function") {
        ric(register, { timeout: 4000 });
      } else {
        setTimeout(register, 2500);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }
  }, []);

  return null;
}
