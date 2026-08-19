"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

const LABEL_MAP: Record<string, string> = {
  "": "Dashboard",
  dashboard: "Dashboard",
  products: "Ürünler",
  new: "Yeni",
  categories: "Kategoriler",
  brands: "Markalar",
  attributes: "Özellikler",
  reviews: "Yorumlar",
  questions: "Soru & Cevap",
  blog: "Blog",
  comments: "Yorumlar",
  "contact-messages": "İletişim Mesajları",
  newsletter: "Bülten",
  faqs: "SSS",
  "stock-alerts": "Stok Bildirimleri",
  orders: "Siparişler",
  returns: "İadeler",
  promotions: "Kupon & Kampanya",
  shipping: "Kargo",
  customers: "Müşteriler",
  users: "Kullanıcı & Roller",
  stock: "Stok",
  warehouses: "Depolar",
  currencies: "Para Birimleri",
  reports: "Raporlar",
  content: "İçerik",
  banners: "Bannerlar",
  "audit-logs": "Denetim Kayıtları",
  settings: "Ayarlar",
  login: "Giriş",
};

function segmentLabel(segment: string) {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Detay";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== "dashboard");

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = segmentLabel(segment);

          return (
            <Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
