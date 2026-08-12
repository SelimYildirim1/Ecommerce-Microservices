import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import BlogSidebar from "@/components/BlogSidebar";
import { BlogListItem } from "@/components/BlogListLayout";
import Pagination from "@/components/Pagination";
import { getBlogCategories, getBlogPosts } from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getBlogCategories();
  const cat = categories.find((c) => c.slug === slug);
  return {
    title: cat ? `${cat.name} | Blog` : "Blog kategorisi",
    description: cat?.description || undefined,
  };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const q = (qRaw ?? "").trim();

  const [categories, result, popular] = await Promise.all([
    getBlogCategories(),
    getBlogPosts({ page, pageSize: 6, category: slug, q: q || undefined }),
    getBlogPosts({ page: 1, pageSize: 5, sort: "popular" }),
  ]);

  const cat = categories.find((c) => c.slug === slug);
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
          {cat?.name ?? slug}
        </h1>
        {cat?.description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {cat.description}
          </p>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div>
              {result.items.map((post) => (
                <BlogListItem key={post.id} post={post} />
              ))}
              {result.items.length === 0 && (
                <p className="py-12 text-center text-muted-foreground">
                  Bu kategoride yazı yok.
                </p>
              )}
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              params={paginationParams}
              basePath={`/blog/kategori/${slug}`}
              variant="blog"
            />
          </div>
          <BlogSidebar
            searchQuery={q}
            categories={categories}
            activeCategory={slug}
            popularPosts={popular.items}
          />
        </div>
      </main>
    </div>
  );
}
