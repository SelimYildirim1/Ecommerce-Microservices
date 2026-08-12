import Link from "next/link";
import Image from "next/image";
import type { BlogPostCard } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { resolveMediaUrl } from "@/lib/catalog";

interface Props {
  post: BlogPostCard;
}

function authorInitials(name?: string | null) {
  if (!name) return "YS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "YS";
}

export function BlogFeaturedPost({ post }: Props) {
  const cover = post.coverImageUrl ? resolveMediaUrl(post.coverImageUrl) : null;

  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Blog
            </div>
          )}
        </div>
      </Link>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.category && (
            <Link
              href={`/blog/kategori/${post.category.slug}`}
              className="font-medium text-foreground hover:underline"
            >
              {post.category.name}
            </Link>
          )}
          {post.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{formatBlogDate(post.publishedAt)}</span>
            </>
          )}
        </div>

        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground transition group-hover:underline md:text-3xl">
            {post.title}
          </h2>
        </Link>

        {post.excerpt && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {post.excerpt}
          </p>
        )}

        {post.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 4).map((t) => (
              <Link
                key={t.slug}
                href={`/blog/etiket/${t.slug}`}
                className="rounded-full bg-muted px-3 py-1 text-xs text-foreground/70 transition hover:bg-foreground hover:text-background"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            {authorInitials(post.authorName)}
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {post.authorName || "Yıldırım Store"}
            </p>
            <p className="text-xs text-muted-foreground">
              {post.readingTimeMinutes} dk okuma
              {post.publishedAt ? ` · ${formatBlogDate(post.publishedAt)}` : ""}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function BlogListItem({ post }: Props) {
  const cover = post.coverImageUrl ? resolveMediaUrl(post.coverImageUrl) : null;

  return (
    <article className="group grid gap-4 border-b border-border py-6 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-6">
      <Link
        href={`/blog/${post.slug}`}
        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:aspect-auto sm:h-[130px]"
      >
        {cover ? (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 200px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Blog
          </div>
        )}
      </Link>

      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.category && (
            <Link
              href={`/blog/kategori/${post.category.slug}`}
              className="font-medium text-foreground hover:underline"
            >
              {post.category.name}
            </Link>
          )}
          {post.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{formatBlogDate(post.publishedAt)}</span>
            </>
          )}
        </div>

        <Link href={`/blog/${post.slug}`}>
          <h2 className="text-lg font-semibold leading-snug text-foreground transition group-hover:underline md:text-xl">
            {post.title}
          </h2>
        </Link>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        {post.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((t) => (
              <Link
                key={t.slug}
                href={`/blog/etiket/${t.slug}`}
                className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-foreground/70 transition hover:bg-foreground hover:text-background"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
