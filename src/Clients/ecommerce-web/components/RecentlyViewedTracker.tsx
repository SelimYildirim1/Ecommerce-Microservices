"use client";

import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/recently-viewed";

interface Props {
  id: string;
  name: string;
  image: string | null;
  price: number;
  brandName?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
}

/** Ürün detayında mevcut ürünü son görüntülenenlere kaydeder. */
export default function RecentlyViewedTracker({
  id,
  name,
  image,
  price,
  brandName,
  averageRating,
  reviewCount,
}: Props) {
  useEffect(() => {
    addRecentlyViewed({
      id,
      name,
      image,
      price,
      brandName,
      averageRating,
      reviewCount,
    });
  }, [id, name, image, price, brandName, averageRating, reviewCount]);

  return null;
}
