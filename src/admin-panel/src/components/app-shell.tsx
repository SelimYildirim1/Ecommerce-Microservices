"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";

const BARE_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b bg-card px-8">
          <NotificationBell />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
