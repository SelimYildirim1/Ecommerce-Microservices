import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import BlogCommentForm from "@/components/BlogCommentForm";
import BlogSidebar from "@/components/BlogSidebar";
import {
  formatBlogDate,
  getBlogCategories,
  getBlogPost,
  getBlogPosts,
} from "@/lib/blog";
import { resolveMediaUrl } from "@/lib/catalog";
import { breadcrumbJsonLd } from "@/lib/jsonld";

interface Props {
  params: Promise<{ slug: string }>;
}

function slugifyHeading(text: string, index: number) {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return base || `bolum-${index + 1}`;
}

function enrichContentWithIds(html: string) {
  const toc: { id: string; text: string }[] = [];
  let i = 0;
  const content = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level, attrs, inner) => {
      const text = String(inner)
        .replace(/<[^>]+>/g, "")
        .trim();
      if (!text) return _match;
      const existing = /id=["']([^"']+)["']/i.exec(attrs);
      const id = existing?.[1] || slugifyHeading(text, i++);
      toc.push({ id, text });
      if (existing) return `<h${level}${attrs}>${inner}</h${level}>`;
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    },
  );
  return { content, toc };
}

function authorInitials(name?: string | null) {
  if (!name) return "YS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "YS";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Yazı bulunamadı" };

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || post.title;

  return {
    title,
    description: description ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      url: `/blog/${post.slug}`,
      images: post.coverImageUrl
        ? [resolveMediaUrl(post.coverImageUrl)]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const [categories, recent] = await Promise.all([
    getBlogCategories(),
    getBlogPosts({ page: 1, pageSize: 5 }),
  ]);

  const cover = post.coverImageUrl
    ? resolveMediaUrl(post.coverImageUrl)
    : null;

  const { content, toc } = enrichContentWithIds(post.content);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const shareUrl = `${siteUrl}/blog/${post.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.metaDescription || undefined,
    image: cover || undefined,
    datePublished: post.publishedAt || undefined,
    author: post.authorName
      ? { "@type": "Person", name: post.authorName }
      : undefined,
    mainEntityOfPage: shareUrl,
  };

  const crumbLd = breadcrumbJsonLd(
    [
      { name: "Ana Sayfa", url: "/" },
      { name: "Blog", url: "/blog" },
      ...(post.category
        ? [
            {
              name: post.category.name,
              url: `/blog/kategori/${post.category.slug}`,
            },
          ]
        : []),
      { name: post.title, url: `/blog/${post.slug}` },
    ],
    siteUrl,
  );

  return (
    <div className="bg-white text-foreground">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }}
      />

      <main className="mx-auto max-w-[1200px] px-6 py-8 md:px-10 md:py-12">
        <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Ana Sayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="line-clamp-1 text-foreground">{post.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <article>
            <header className="mb-8">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                {post.category && (
                  <Link
                    href={`/blog/kategori/${post.category.slug}`}
                    className="rounded-full bg-foreground px-3.5 py-1 text-xs font-medium text-background"
                  >
                    {post.category.name}
                  </Link>
                )}
                <span className="text-muted-foreground">
                  {post.readingTimeMinutes} dk okuma
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.5rem] lg:leading-tight">
                {post.title}
              </h1>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {authorInitials(post.authorName)}
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {post.authorName || "Yıldırım Store"}
                  </p>
                  <p className="text-muted-foreground">
                    {formatBlogDate(post.publishedAt)}
                  </p>
                </div>
              </div>
            </header>

            {cover && (
              <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={cover}
                  alt={post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            <div
              className="blog-prose max-w-none leading-[1.8] text-foreground/80"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {post.tags?.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-8">
                {post.tags.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/blog/etiket/${t.slug}`}
                    className="rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-foreground hover:text-background"
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-6 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-lg font-semibold text-background">
                {authorInitials(post.authorName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {post.authorName || "Yıldırım Store"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  E-ticaret, dijital büyüme ve müşteri deneyimi üzerine yazılar
                  paylaşıyoruz.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                Tüm yazılar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <section className="mt-12 border-t border-border pt-10">
              <h2 className="text-xl font-semibold">Yorumlar</h2>
              {post.comments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Henüz onaylanmış yorum yok. İlk yorumu siz yazın.
                </p>
              ) : (
                <ul className="mt-6 space-y-4">
                  {post.comments.map((c) => (
                    <li key={c.id} className="rounded-xl border border-border p-4">
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="font-medium">{c.authorName}</span>
                        <span className="text-muted-foreground">
                          {formatBlogDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.content}</p>
                    </li>
                  ))}
                </ul>
              )}
              <BlogCommentForm slug={post.slug} />
            </section>

            {post.related.length > 0 && (
              <section className="mt-12 border-t border-border pt-10">
                <h2 className="mb-6 text-xl font-semibold">İlgili yazılar</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {post.related.map((r) => {
                    const relCover = r.coverImageUrl
                      ? resolveMediaUrl(r.coverImageUrl)
                      : null;
                    return (
                      <Link
                        key={r.slug}
                        href={`/blog/${r.slug}`}
                        className="group overflow-hidden rounded-2xl border border-border transition hover:border-foreground"
                      >
                        <div className="relative aspect-[16/10] bg-muted">
                          {relCover && (
                            <Image
                              src={relCover}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 100vw, 33vw"
                              className="object-cover transition group-hover:scale-105"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-medium leading-snug group-hover:underline">
                            {r.title}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {r.readingTimeMinutes} dk ·{" "}
                            {formatBlogDate(r.publishedAt)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </article>

          <BlogSidebar
            categories={categories}
            recentPosts={recent.items.filter((p) => p.slug !== post.slug)}
            toc={toc}
            share={{ title: post.title, url: shareUrl }}
            showCategories={false}
          />
        </div>
      </main>
    </div>
  );
}
