"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";

interface Props {
  productId: string;
  /** `overlay` urun kartinin uzerinde durur, `inline` detay sayfasindaki buton. */
  variant?: "overlay" | "inline";
}

export default function FavoriteButton({ productId, variant = "overlay" }: Props) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const router = useRouter();

  const active = isFavorite(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }

    await toggle(productId);
  };

  const label = active ? "Favorilerden çıkar" : "Favorilere ekle";

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        title={label}
        aria-label={label}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition
          ${active
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-border text-foreground hover:bg-muted"
          }`}
      >
        <HeartIcon filled={active} />
        {active ? "Favorilerimde" : "Favorilere ekle"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      title={label}
      aria-label={label}
      className={`absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full
        bg-white shadow-sm transition-transform hover:scale-110
        ${active ? "text-red-500" : "text-gray-400"}`}
    >
      <HeartIcon filled={active} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}
