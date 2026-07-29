"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getNotifications } from "@/lib/api";
import type { NotificationSeverity } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Bildirimler bir dakikada bir tazelenir; panel acikken sayilar guncel kalir. */
const REFETCH_INTERVAL = 60_000;

const SEVERITY_STYLES: Record<NotificationSeverity, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: REFETCH_INTERVAL,
    // Bildirim merkezi ikincil bir ozellik; hata halinde panel sessizce calisir
    retry: false,
  });

  const items = data?.items ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {items.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Bekleyen iş yok.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                key={`${item.type}-${item.title}`}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span>{item.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.info
                  }`}
                >
                  {item.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
