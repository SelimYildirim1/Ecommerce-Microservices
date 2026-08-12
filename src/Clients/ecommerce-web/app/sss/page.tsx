import type { Metadata } from "next";
import Header from "@/components/Header";
import FaqAccordion from "@/components/FaqAccordion";
import { getFaqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "Sipariş, kargo, iade ve ödeme hakkında sık sorulan sorular.",
  alternates: { canonical: "/sss" },
  openGraph: {
    title: "Sıkça Sorulan Sorular | Yıldırım Store",
    description: "Sipariş, kargo, iade ve ödeme hakkında sık sorulan sorular.",
    url: "/sss",
  },
};

export default async function FaqPage() {
  const faqs = await getFaqs();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      },
    })),
  };

  return (
    <div className="bg-white text-gray-900">
      <Header />
      <main className="mx-auto max-w-[900px] px-6 py-10 md:px-12">
        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            SSS
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Sıkça sorulan sorular
          </h1>
          <p className="mt-3 text-gray-500">
            Sipariş, kargo ve iade süreçleri hakkında bilmeniz gerekenler.
          </p>
        </div>

        {faqs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Henüz SSS eklenmemiş.
          </p>
        ) : (
          <FaqAccordion items={faqs} />
        )}
      </main>

      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </div>
  );
}
