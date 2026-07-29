// =============================================================
//  Panelden yonetilen icerik: banner, statik sayfa, site ayarlari
// =============================================================
// Sunucu bileseninden okunur. Icerik servisi kapaliysa vitrin
// bos deger alir ve varsayilan tasarimiyla calismaya devam eder.

import { serverFetchJson } from "@/lib/server-fetch";

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  placement: string;
  sortOrder: number;
}

export interface StaticPageLink {
  slug: string;
  title: string;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export type SiteSettings = Record<string, string | null>;

export const getBanners = (placement = "home-slider") =>
  serverFetchJson<Banner[]>(`/catalog/cms/banners?placement=${placement}`, []);

export const getFooterPages = () =>
  serverFetchJson<StaticPageLink[]>("/catalog/cms/pages?footerOnly=true", []);

export const getStaticPage = (slug: string) =>
  serverFetchJson<StaticPage | null>(`/catalog/cms/pages/${slug}`, null);

export const getSiteSettings = () =>
  serverFetchJson<SiteSettings>("/catalog/settings", {});
