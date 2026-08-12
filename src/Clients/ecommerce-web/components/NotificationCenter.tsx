"use client";

import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SIGNALR_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Notif = {
  id: string;
  title: string;
  body: string;
  href?: string;
  at: number;
  read: boolean;
};

const STORAGE_KEY = "order-notifications";

function loadStored(): Notif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Notif[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

function persist(items: Notif[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
}

/** Header bildirim merkezi — OrderStatusHub SignalR. */
export default function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(loadStored());
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
          title: "Sipariş güncellendi",
          body: `Sipariş durumu: ${payload.status}`,
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
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Bildirimler"
        title="Bildirimler"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
            <span className="text-sm font-semibold">Bildirimler</span>
            <Link
              href="/account/orders"
              className="text-xs text-gray-500 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Siparişler
            </Link>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                Henüz bildirim yok
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-gray-50 last:border-0">
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-muted/60"
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                    </Link>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
