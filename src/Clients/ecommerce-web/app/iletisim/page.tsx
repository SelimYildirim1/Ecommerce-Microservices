import type { Metadata } from "next";
import Header from "@/components/Header";
import ContactForm from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/cms";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Bize ulaşın — soru, öneri ve destek talepleriniz için.",
  alternates: { canonical: "/iletisim" },
  openGraph: {
    title: "İletişim | Yıldırım Store",
    description: "Bize ulaşın — soru, öneri ve destek talepleriniz için.",
    url: "/iletisim",
  },
};

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const email = settings["site.email"];
  const phone = settings["site.phone"];
  const address = settings["site.address"];

  return (
    <div className="bg-white text-gray-900">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-12">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            İletişim
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Bize yazın
          </h1>
          <p className="mt-3 text-gray-500">
            Formu doldurun; müşteri hizmetlerimiz en kısa sürede dönüş yapsın.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="max-w-2xl">
            <ContactForm />
          </div>
          <aside className="space-y-4 text-sm text-gray-600">
            {phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {phone}
              </p>
            )}
            {email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {email}
              </p>
            )}
            {address && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                {address}
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
