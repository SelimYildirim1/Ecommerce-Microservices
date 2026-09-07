import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import CompareButton from "./CompareButton";
import FavoriteButton from "./FavoriteButton";
import ProductCardGallery from "./ProductCardGallery";
import StarRating from "./StarRating";
import { formatPrice, getCardImageUrls, getPrice, type Product } from "@/lib/catalog";

/** Anasayfa, liste ve favori sayfalarinin paylastigi urun karti. */
export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const price = getPrice(product);
  const imageUrls = getCardImageUrls(product);
  const rating = product.averageRating ?? 0;
  const reviewCount = product.reviewCount ?? 0;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <ProductCardGallery
          urls={imageUrls}
          alt={product.name}
          href={`/products/${product.id}`}
          priority={priority}
        />

        <FavoriteButton productId={product.id} />
        <CompareButton
          product={{
            id: product.id,
            name: product.name,
            image: product.primaryImageUrl,
            price,
            brandName: product.brandName,
            categoryName: product.categoryName,
            description: product.description,
            stock: product.stock,
            averageRating: product.averageRating,
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {product.brandName && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {product.brandName}
          </p>
        )}

        <Link href={`/products/${product.id}`}>
          <h3 className="mb-1 line-clamp-2 text-base font-semibold leading-snug text-gray-900">
            {product.name}
          </h3>
        </Link>

        {reviewCount > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            <StarRating value={rating} />
            <span className="text-[11px] text-gray-400">({reviewCount})</span>
          </div>
        )}

        <p className="mb-4 line-clamp-2 flex-1 text-sm text-gray-500">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-semibold text-gray-900">
            {formatPrice(price)}
          </span>

          <AddToCartButton
            variant="icon"
            product={{
              id: product.id,
              name: product.name,
              price,
              pictureUrl: product.primaryImageUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
