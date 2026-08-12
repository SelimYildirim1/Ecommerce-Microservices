import Link from "next/link";
import Image from "next/image";
import type { BlogPostCard } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { resolveMediaUrl } from "@/lib/catalog";

interface Props {
  post: BlogPostCard;
}

export default function BlogPostCardView({ post }: Props) {
  const cover = post.coverImageUrl ? resolveMediaUrl(post.coverImageUrl) : null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white transition hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Blog
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {post.category && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
                {post.category.name}
              </span>
            )}
            {post.publishedAt && <span>{formatBlogDate(post.publishedAt)}</span>}
            <span>{post.readingTimeMinutes} dk okuma</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight group-hover:underline">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500">
              {post.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
