import { resolveMediaUrl } from "@/lib/catalog";
import { getBanners } from "@/lib/cms";
import HeroSlider, { type HeroSlide } from "./HeroSlider";

/**
 * Panelde tanımlı ana sayfa bannerlarını gösterir.
 * Yoksa varsayılan görsele düşer.
 */
export default async function HeroBanner() {
  const banners = await getBanners("home-slider");

  const slides: HeroSlide[] = banners.length
    ? banners.map((banner) => ({
        id: banner.id,
        imageUrl: resolveMediaUrl(banner.imageUrl),
        linkUrl: banner.linkUrl,
      }))
    : [
        {
          id: "default",
          imageUrl: resolveMediaUrl("/img/banners/banner-1.jpg"),
          linkUrl: "/products",
        },
      ];

  return <HeroSlider slides={slides} />;
}
