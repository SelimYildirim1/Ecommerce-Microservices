// =============================================================
//  Blog (vitrin) — Catalog.API PublicBlogController
// =============================================================

import { serverFetchJson } from "@/lib/server-fetch";

export interface BlogTagRef {
  name: string;
  slug: string;
}

export interface BlogCategoryRef {
  name: string;
  slug: string;
}

export interface BlogPostCard {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  readingTimeMinutes: number;
  publishedAt?: string | null;
  isFeatured: boolean;
  viewCount: number;
  category?: BlogCategoryRef | null;
  tags: BlogTagRef[];
}

export interface BlogPostsResult {
  items: BlogPostCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BlogComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface BlogPostDetail extends BlogPostCard {
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  related: Array<{
    title: string;
    slug: string;
    excerpt?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: string | null;
    readingTimeMinutes: number;
  }>;
  comments: BlogComment[];
}

export interface BlogCategory {
  name: string;
  slug: string;
  description?: string | null;
  postCount: number;
}

export interface BlogTag {
  name: string;
  slug: string;
  postCount: number;
}

export function getBlogPosts(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
  q?: string;
  sort?: "newest" | "popular";
  featuredOnly?: boolean;
}): Promise<BlogPostsResult> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.category) qs.set("category", params.category);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.q) qs.set("q", params.q);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.featuredOnly) qs.set("featuredOnly", "true");
  const suffix = qs.toString() ? `?${qs}` : "";

  return serverFetchJson<BlogPostsResult>(
    `/catalog/blog/posts${suffix}`,
    {
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 0,
    },
    { revalidate: 60 },
  );
}

export function getBlogPost(slug: string): Promise<BlogPostDetail | null> {
  return serverFetchJson<BlogPostDetail | null>(
    `/catalog/blog/posts/${encodeURIComponent(slug)}`,
    null,
    { revalidate: 60 },
  );
}

export function getBlogCategories(): Promise<BlogCategory[]> {
  return serverFetchJson<BlogCategory[]>("/catalog/blog/categories", [], {
    revalidate: 120,
  });
}

export function getBlogTags(): Promise<BlogTag[]> {
  return serverFetchJson<BlogTag[]>("/catalog/blog/tags", [], {
    revalidate: 120,
  });
}

export function formatBlogDate(value?: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
