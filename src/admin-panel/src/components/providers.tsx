"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import {
  decodeToken,
  ensureFreshToken,
  getToken,
  refreshToken,
} from "@/lib/auth";

/** Panel oturumunda token suresi dolmadan sessiz yenileme zamanlar. */
function TokenRefreshScheduler() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const schedule = (token: string | null) => {
      if (timer) clearTimeout(timer);
      if (!token || cancelled) return;

      const payload = decodeToken(token);
      if (!payload?.exp) return;

      const ms = payload.exp * 1000 - Date.now() - 2 * 60 * 1000;
      if (ms <= 0) {
        void refreshToken().then((next) => {
          if (!cancelled) schedule(next ?? getToken());
        });
        return;
      }

      timer = setTimeout(() => {
        void refreshToken().then((next) => {
          if (!cancelled) schedule(next ?? getToken());
        });
      }, Math.min(ms, 2147483647));
    };

    void ensureFreshToken().then((token) => {
      if (!cancelled) schedule(token);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, retry: 1 },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TokenRefreshScheduler />
        {children}
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
