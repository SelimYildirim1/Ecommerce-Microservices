"use client";

import FavoritesList from "@/components/account/FavoritesList";
import { useFavorites } from "@/context/FavoritesContext";

export default function AccountFavoritesPage() {
  const { revision } = useFavorites();

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Favorilerim</h2>
      {/* revision key: soft-nav cache eski listeyi tutmasin */}
      <FavoritesList key={revision} />
    </div>
  );
}
