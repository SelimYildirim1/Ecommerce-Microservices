import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { resolveMediaUrl } from "@/lib/catalog";
import {
  BANNER_PLACEMENT_DESKTOP,
  BANNER_PLACEMENT_MOBILE,
  getBanners,
  type Banner,
} from "@/lib/cms";
import HeroSlider, { HERO_IMAGE_QUALITY, type HeroSlide } from "./HeroSlider";

const DEFAULT_SLIDE: HeroSlide = {
  id: "default",
  imageUrl: resolveMediaUrl("/img/banners/banner-1.jpg"),
  linkUrl: "/products",
};

const toSlides = (banners: Banner[]): HeroSlide[] =>
  banners.map((banner) => ({
    id: banner.id,
    imageUrl: resolveMediaUrl(banner.imageUrl),
    linkUrl: banner.linkUrl,
    title: banner.title,
    subtitle: banner.subtitle,
    ctaText: banner.ctaText,
  }));

/**
 * Panelde tanımlı ana sayfa bannerlarını gösterir. Mobil ve masaüstü listeleri
 * bağımsızdır; ikisi de sunucuda çekilip CSS kırılımıyla gösterildiği için
 * ilk boyamada doğru banner çıkar. Mobil banner tanımlı değilse mobilde de
 * web bannerları gösterilmeye devam eder.
 */
export default async function HeroBanner() {
  const [desktopBanners, mobileBanners] = await Promise.all([
    getBanners(BANNER_PLACEMENT_DESKTOP),
    getBanners(BANNER_PLACEMENT_MOBILE),
  ]);

  const desktopSlides = desktopBanners.length ? toSlides(desktopBanners) : [DEFAULT_SLIDE];
  const mobileSlides = mobileBanners.length ? toSlides(mobileBanners) : null;

  if (!mobileSlides) {
    return (
      <>
        <LcpPreload src={desktopSlides[0]?.imageUrl} media="(min-width: 768px)" width={1920} />
        <LcpPreload src={desktopSlides[0]?.imageUrl} media="(max-width: 767px)" width={1080} />
        <HeroSlider slides={desktopSlides} variant="desktop" />
      </>
    );
  }

  return (
    <>
      <LcpPreload src={mobileSlides[0]?.imageUrl} media="(max-width: 767px)" width={1080} />
      <LcpPreload src={desktopSlides[0]?.imageUrl} media="(min-width: 768px)" width={1920} />
      <div className="md:hidden">
        <HeroSlider slides={mobileSlides} variant="mobile" />
      </div>
      <div className="hidden md:block">
        <HeroSlider slides={desktopSlides} variant="desktop" />
      </div>
    </>
  );
}

/** Görünen kırılımın ilk slaytını öncelikli indir; gizli varyantı indirmez. */
function LcpPreload({
  src,
  media,
  width,
}: {
  src?: string;
  media: string;
  width: number;
}) {
  if (!src) return null;
  const { props } = getImageProps({
    src,
    alt: "",
    width,
    height: Math.round(width * 0.62),
    quality: HERO_IMAGE_QUALITY,
    sizes: "100vw",
  });
  preload(props.src, {
    as: "image",
    fetchPriority: "high",
    ...(props.srcSet ? { imageSrcSet: props.srcSet } : {}),
    ...(props.sizes ? { imageSizes: props.sizes } : {}),
    media,
  });
  return null;
}
