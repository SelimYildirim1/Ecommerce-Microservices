import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import BlogSidebar from "@/components/BlogSidebar";
import { BlogListItem } from "@/components/BlogListLayout";
import Pagination from "@/components/Pagination";
import { getBlogCategories, getBlogPosts, getBlogTags } from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getBlogTags();
  const tag = tags.find((t) => t.slug === slug);
  return {
    title: tag ? `#${tag.name} | Blog` : "Blog etiketi",
  };
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const q = (qRaw ?? "").trim();

  const [categories, tags, result, popular] = await Promise.all([
    getBlogCategories(),
    getBlogTags(),
    getBlogPosts({ page, pageSize: 6, tag: slug, q: q || undefined }),
    getBlogPosts({ page: 1, pageSize: 5, sort: "popular" }),
  ]);

  const tag = tags.find((t) => t.slug === slug);
  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;

  return (
    <div className="bg-white text-foreground">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10 md:px-10">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Blog
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          #{tag?.name ?? slug}
        </h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div>
              {result.items.map((post) => (
                <BlogListItem key={post.id} post={post} />
              ))}
              {result.items.length === 0 && (
                <p className="py-12 text-center text-muted-foreground">
                  Bu etikette yazı yok.
                </p>
              )}
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              params={paginationParams}
              basePath={`/blog/etiket/${slug}`}
              variant="blog"
            />
          </div>
          <BlogSidebar
            searchQuery={q}
            categories={categories}
            popularPosts={popular.items}
          />
        </div>
      </main>
    </div>
  );
}
