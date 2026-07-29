import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const ORDER_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  Submitted: { label: "Beklemede", variant: "secondary" },
  Paid: { label: "Ödendi", variant: "default" },
  Shipped: { label: "Kargoda", variant: "outline" },
  Delivered: { label: "Teslim Edildi", variant: "default" },
  Cancelled: { label: "İptal", variant: "destructive" },
  Returned: { label: "İade Edildi", variant: "outline" },
  Failed: { label: "Başarısız", variant: "destructive" },
  StockFailed: { label: "Stok Yetersiz", variant: "destructive" },
};
