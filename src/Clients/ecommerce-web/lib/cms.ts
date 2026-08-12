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
  categoryId?: string | null;
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

export interface NavMenuLink {
  id: string;
  label: string;
  url?: string | null;
  linkType?: string;
  openInNewTab?: boolean;
  children?: NavMenuLink[];
}

export interface NavMenuResponse {
  id?: string;
  name?: string;
  location: string;
  items: NavMenuLink[];
}

const CMS_REVALIDATE = 60;

export const getBanners = (placement = "home-slider") =>
  serverFetchJson<Banner[]>(
    `/catalog/cms/banners?placement=${placement}`,
    [],
    { revalidate: CMS_REVALIDATE },
  );

export const getFooterPages = () =>
  serverFetchJson<StaticPageLink[]>(
    "/catalog/cms/pages?footerOnly=true",
    [],
    { revalidate: CMS_REVALIDATE },
  );

export const getStaticPage = (slug: string) =>
  serverFetchJson<StaticPage | null>(`/catalog/cms/pages/${slug}`, null, {
    revalidate: CMS_REVALIDATE,
  });

export const getSiteSettings = () =>
  serverFetchJson<SiteSettings>("/catalog/settings", {}, {
    revalidate: CMS_REVALIDATE,
  });

export const getNavMenu = (location: string) =>
  serverFetchJson<NavMenuResponse | null>(
    `/catalog/cms/menus/${location}`,
    null,
    { revalidate: CMS_REVALIDATE },
  );
