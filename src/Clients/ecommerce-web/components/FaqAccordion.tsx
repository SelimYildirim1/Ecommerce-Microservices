"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/content";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const byCategory = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
    const key = item.category || "Genel";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      {Object.entries(byCategory).map(([category, faqs]) => (
        <section key={category}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h2>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((faq) => {
              const open = openId === faq.id;
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : faq.id)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  >
                    <span className="font-medium text-foreground">{faq.question}</span>
                    <span className="text-muted-foreground">{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <div
                      className="prose prose-sm max-w-none pb-4 text-gray-600"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
