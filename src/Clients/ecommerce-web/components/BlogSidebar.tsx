import Link from "next/link";
import Image from "next/image";
import type { BlogCategory, BlogPostCard } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog";
import { resolveMediaUrl } from "@/lib/catalog";
import BlogSearchForm from "@/components/BlogSearchForm";
import BlogNewsletterCard from "@/components/BlogNewsletterCard";
import BlogShareButtons from "@/components/BlogShareButtons";

interface TocItem {
  id: string;
  text: string;
}

interface Props {
  searchQuery?: string;
  categories?: BlogCategory[];
  activeCategory?: string | null;
  popularPosts?: BlogPostCard[];
  recentPosts?: BlogPostCard[];
  toc?: TocItem[];
  share?: { title: string; url: string } | null;
  showSearch?: boolean;
  showCategories?: boolean;
  showNewsletter?: boolean;
}

export default function BlogSidebar({
  searchQuery = "",
  categories = [],
  activeCategory = null,
  popularPosts = [],
  recentPosts = [],
  toc = [],
  share = null,
  showSearch = true,
  showCategories = true,
  showNewsletter = true,
}: Props) {
  const postsForList = popularPosts.length > 0 ? popularPosts : recentPosts;
  const listTitle = popularPosts.length > 0 ? "Popüler Yazılar" : "Son Yazılar";

  return (
    <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
      {showSearch && <BlogSearchForm initialQuery={searchQuery} />}

      {toc.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            İçindekiler
          </h2>
          <nav className="space-y-2.5">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-sm leading-snug text-foreground/70 transition hover:text-foreground"
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      {share && (
        <div className="rounded-2xl border border-border p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Paylaş
          </h2>
          <BlogShareButtons title={share.title} url={share.url} />
        </div>
      )}

      {showCategories && categories.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Kategoriler
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                !activeCategory
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground/80 hover:bg-foreground/10"
              }`}
            >
              Hepsi
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/blog/kategori/${c.slug}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  activeCategory === c.slug
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground/80 hover:bg-foreground/10"
                }`}
              >
                {c.name} ({c.postCount})
              </Link>
            ))}
          </div>
        </div>
      )}

      {postsForList.length > 0 && (
        <div className="rounded-2xl border border-border p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {listTitle}
          </h2>
          <ul className="space-y-4">
            {postsForList.slice(0, 5).map((post) => {
              const cover = post.coverImageUrl
                ? resolveMediaUrl(post.coverImageUrl)
                : null;
              return (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="group flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {cover ? (
                        <Image
                          src={cover}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          Blog
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline">
                        {post.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBlogDate(post.publishedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showNewsletter && <BlogNewsletterCard />}
    </aside>
  );
}
