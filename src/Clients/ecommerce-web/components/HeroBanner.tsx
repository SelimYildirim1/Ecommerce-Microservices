import { resolveMediaUrl } from "@/lib/catalog";
import { getBanners, getSiteSettings } from "@/lib/cms";
import HeroSlider, { type HeroSlide } from "./HeroSlider";

/**
 * Panelde banner tanimliysa onlari gosterir, yoksa ayarlardan beslenen
 * varsayilan hero alanina duser. Boylece vitrin her durumda dolu kalir.
 */
export default async function HeroBanner() {
  const [banners, settings] = await Promise.all([getBanners(), getSiteSettings()]);

  const slides: HeroSlide[] = banners.length
    ? banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: resolveMediaUrl(banner.imageUrl),
        linkUrl: banner.linkUrl,
      }))
    : [
        {
          id: "default",
          title: "Günün Fırsatları",
          subtitle:
            settings["site.description"] ||
            "En yeni ürünler, en uygun fiyatlarla sizi bekliyor.",
          imageUrl: resolveMediaUrl("/img/banners/banner-1.jpg"),
          linkUrl: "/products",
        },
      ];

  return <HeroSlider slides={slides} />;
}
