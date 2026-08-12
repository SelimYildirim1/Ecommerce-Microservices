import type { Metadata } from "next";
import Header from "@/components/Header";
import BlogSidebar from "@/components/BlogSidebar";
import { BlogFeaturedPost, BlogListItem } from "@/components/BlogListLayout";
import Pagination from "@/components/Pagination";
import { getBlogCategories, getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Yıldırım Store",
  description:
    "E-ticaret trendleri, ürün sayfası optimizasyonu, sepet terk ve büyüme rehberleri.",
};

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

const PAGE_SIZE = 6;

export default async function BlogIndexPage({ searchParams }: Props) {
  const { page: pageRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const q = (qRaw ?? "").trim();

  const [result, categories, popular, recent] = await Promise.all([
    getBlogPosts({ page, pageSize: PAGE_SIZE, q: q || undefined }),
    getBlogCategories(),
    getBlogPosts({ page: 1, pageSize: 5, sort: "popular" }),
    getBlogPosts({ page: 1, pageSize: 5 }),
  ]);

  const showFeatured = page === 1 && !q && result.items.length > 0;
  const featured = showFeatured ? result.items[0] : null;
  const listItems = showFeatured ? result.items.slice(1) : result.items;

  const paginationParams: Record<string, string> = {};
  if (q) paginationParams.q = q;

  return (
    <div className="bg-white text-foreground">
      <Header />

      <main className="mx-auto max-w-[1200px] px-6 py-10 md:px-10 md:py-14">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Blog
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            İlham ve rehberler
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            E-ticaret stratejileri, dönüşüm optimizasyonu ve müşteri deneyimi
            üzerine pratik yazılar.
          </p>
          {q && (
            <p className="mt-4 text-sm text-muted-foreground">
              “{q}” için {result.total} sonuç
            </p>
          )}
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
          <div>
            {result.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                {q
                  ? "Aramanızla eşleşen yazı bulunamadı."
                  : "Henüz yayınlanmış yazı yok."}
              </p>
            ) : (
              <>
                {featured && (
                  <div className="mb-8 border-b border-border pb-8">
                    <BlogFeaturedPost post={featured} />
                  </div>
                )}

                {listItems.length > 0 && (
                  <div>
                    {listItems.map((post) => (
                      <BlogListItem key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </>
            )}

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              params={paginationParams}
              basePath="/blog"
              variant="blog"
            />
          </div>

          <BlogSidebar
            searchQuery={q}
            categories={categories}
            popularPosts={popular.items}
            recentPosts={recent.items}
          />
        </div>
      </main>
    </div>
  );
}
