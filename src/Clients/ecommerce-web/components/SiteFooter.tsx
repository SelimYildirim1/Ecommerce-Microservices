import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFooterPages, getNavMenu, getSiteSettings } from "@/lib/cms";
import NewsletterForm from "@/components/NewsletterForm";

/** Alt menu ve iletisim bilgileri panelden yonetilir. */
export default async function SiteFooter() {
  const t = await getTranslations("Footer");
  const [pages, settings, footerMenu] = await Promise.all([
    getFooterPages(),
    getSiteSettings(),
    getNavMenu("footer"),
  ]);

  const siteName = settings["site.name"] || "Yıldırım Store";
  const email = settings["site.email"];
  const phone = settings["site.phone"];
  const address = settings["site.address"];

  const shortcuts =
    footerMenu?.items && footerMenu.items.length > 0
      ? footerMenu.items.map((item) => ({
          href: item.url || "#",
          label: item.label,
        }))
      : [
          { href: "/products", label: t("allProducts") },
          { href: "/products?sort=Newest", label: t("newArrivals") },
          { href: "/products?sort=Rating", label: t("topRated") },
          { href: "/products?sort=PriceAsc", label: t("affordable") },
          { href: "/karsilastir", label: t("compare") },
          { href: "/blog", label: t("blog") },
          { href: "/siparis-takip", label: t("orderTracking") },
          { href: "/sss", label: t("faq") },
          { href: "/iletisim", label: t("contactPage") },
        ];

  const socials = [
    { label: "Instagram", href: settings["social.instagram"] },
    { label: "X", href: settings["social.twitter"] },
    { label: "Facebook", href: settings["social.facebook"] },
  ].filter((item) => item.href);

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-[1600px] px-6 py-14 md:px-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-white">
                YS
              </span>
              <span className="text-lg font-semibold">{siteName}</span>
            </div>

            {settings["site.description"] && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                {settings["site.description"]}
              </p>
            )}

            {socials.length > 0 && (
              <div className="mt-6 flex gap-3">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href!}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}

            <NewsletterForm />
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-gray-900">{t("shopping")}</p>
            <ul className="space-y-3">
              {shortcuts.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {pages.length > 0 && (
            <div>
              <p className="mb-4 text-sm font-semibold text-gray-900">{t("corporate")}</p>
              <ul className="space-y-3">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/pages/${page.slug}`}
                      className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-4 text-sm font-semibold text-gray-900">{t("contact")}</p>
            <ul className="space-y-3 text-sm text-gray-500">
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  {phone}
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  {email}
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {siteName}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
