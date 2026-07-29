"use client";

import { usePathname } from "next/navigation";

const HIDDEN_ROUTES = ["/login", "/register"];

/** Giris ve kayit ekranlari tam sayfa form oldugu icin alt bilgi gizlenir. */
export default function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return <>{children}</>;
}
