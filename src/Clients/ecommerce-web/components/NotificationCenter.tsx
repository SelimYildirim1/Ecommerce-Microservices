"use client";

import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";
import {
  Bell,
  BellOff,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Package,
  PackageCheck,
  Truck,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SIGNALR_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getOrderNotificationCopy } from "@/lib/order-status";

type Notif = {
  id: string;
  status: string;
  href?: string;
  at: number;
  read: boolean;
};

const STORAGE_KEY = "order-notifications";

function inferStatus(raw: {
  status?: string;
  body?: string;
}): string {
  if (raw.status) return raw.status;
  const match = raw.body?.match(/Sipariş durumu:\s*(\w+)/i);
  return match?.[1] ?? "";
}

function loadStored(): Notif[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 30).map((item: Record<string, unknown>) => ({
      id: String(item.id ?? crypto.randomUUID()),
      status: inferStatus({
        status: typeof item.status === "string" ? item.status : undefined,
        body: typeof item.body === "string" ? item.body : undefined,
      }),
      href: typeof item.href === "string" ? item.href : undefined,
      at: typeof item.at === "number" ? item.at : Date.now(),
      read: Boolean(item.read),
    }));
  } catch {
    return [];
  }
}

function persist(items: Notif[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
}

function formatNotifTime(at: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
}

function statusVisual(status: string): { Icon: LucideIcon; wrap: string } {
  switch (status) {
    case "Paid":
      return { Icon: CircleCheck, wrap: "bg-emerald-50 text-emerald-600" };
    case "Submitted":
      return { Icon: Package, wrap: "bg-blue-50 text-blue-600" };
    case "Shipped":
      return { Icon: Truck, wrap: "bg-indigo-50 text-indigo-600" };
    case "Delivered":
      return { Icon: PackageCheck, wrap: "bg-emerald-50 text-emerald-700" };
    case "Cancelled":
      return { Icon: CircleX, wrap: "bg-red-50 text-red-600" };
    case "Returned":
      return { Icon: Undo2, wrap: "bg-amber-50 text-amber-700" };
    case "StockFailed":
    case "Failed":
      return { Icon: CircleAlert, wrap: "bg-red-50 text-red-600" };
    default:
      return { Icon: Bell, wrap: "bg-gray-100 text-gray-600" };
  }
}

/** Header bildirim merkezi — OrderStatusHub SignalR. */
export default function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = loadStored();
    setItems(stored);
    persist(stored);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = Cookies.get("token");
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${SIGNALR_URL}/hubs/orderStatus`, {
        withCredentials: true,
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on(
      "OrderStatusUpdated",
      (payload: { orderId: string; status: string }) => {
        const next: Notif = {
          id: `${payload.orderId}-${payload.status}-${Date.now()}`,
          status: payload.status,
          href: `/account/orders/${payload.orderId}`,
          at: Date.now(),
          read: false,
        };
        setItems((prev) => {
          const merged = [next, ...prev].slice(0, 30);
          persist(merged);
          return merged;
        });
      },
    );

    connection.start().catch(() => undefined);
    return () => {
      connection.stop().catch(() => undefined);
    };
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!user) return null;

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = () => {
    setItems((prev) => {
      const next = prev.map((i) => ({ ...i, read: true }));
      persist(next);
      return next;
    });
  };

  const markRead = (id: string) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, read: true } : i));
      persist(next);
      return next;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Bildirimler"
        title="Bildirimler"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
            <span className="text-sm font-semibold">Bildirimler</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Tümünü oku
              </button>
            )}
          </div>
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
                  <BellOff className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-gray-400">Henüz bildirim yok</p>
              </li>
            ) : (
              items.map((n) => {
                const copy = getOrderNotificationCopy(n.status);
                const { Icon, wrap } = statusVisual(n.status);
                const content = (
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-2 w-2 shrink-0 rounded-full ${
                        n.read ? "bg-transparent" : "bg-blue-700"
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${wrap}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                        {copy.body}
                      </p>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        {formatNotifTime(n.at)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li
                    key={n.id}
                    className={`border-b border-gray-50 last:border-0 ${
                      n.read ? "bg-white" : "bg-gray-50/80"
                    }`}
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className="block px-3 py-3 hover:bg-muted/70"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="block w-full px-3 py-3 text-left hover:bg-muted/70"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          {items.length > 0 && (
            <div className="border-t border-gray-50 px-4 py-2.5">
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-medium text-gray-500 hover:text-foreground"
              >
                Siparişlerimi gör
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
