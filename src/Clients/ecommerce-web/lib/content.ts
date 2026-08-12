// =============================================================
//  İçerik modülleri (vitrin) — contact / newsletter / faqs / stock-alerts
// =============================================================

import { serverFetchJson } from "@/lib/server-fetch";

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export function getFaqs() {
  return serverFetchJson<FaqItem[]>("/catalog/faqs", [], { revalidate: 120 });
}
