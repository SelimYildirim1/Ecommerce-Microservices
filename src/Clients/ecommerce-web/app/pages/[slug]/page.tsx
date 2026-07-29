import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { getStaticPage } from "@/lib/cms";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getStaticPage(slug);

  if (!page) return { title: "Sayfa bulunamadi" };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription ?? undefined,
  };
}

export default async function StaticContentPage({ params }: Props) {
  const { slug } = await params;
  const page = await getStaticPage(slug);

  if (!page) notFound();

  return (
    <div className="bg-white text-gray-900">
      <Header />

      <article className="mx-auto max-w-3xl px-6 py-14 md:px-12">
        <h1 className="font-display text-4xl font-bold tracking-tight">{page.title}</h1>

        {page.content ? (
          // Icerik panelden HTML olarak girilir; yalnizca yoneticiler duzenleyebilir
          <div
            className="mt-8 max-w-none leading-relaxed text-gray-600 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_li]:mt-1 [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : (
          <p className="mt-6 text-gray-500">Bu sayfanın içeriği henüz eklenmedi.</p>
        )}
      </article>

    </div>
  );
}
