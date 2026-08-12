"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { API_URL } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/catalog";
import {
  buildCategoryTree,
  categoryHref,
  type CategoryTreeNode,
  type StorefrontCategory,
} from "@/lib/categories";

interface MegaBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  categoryId?: string | null;
}

export default function CategoryMegaMenu() {
  const [roots, setRoots] = useState<CategoryTreeNode[]>([]);
  const [banners, setBanners] = useState<MegaBanner[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [catsRes, bannerRes] = await Promise.all([
          fetch(`${API_URL}/catalog/categories`),
          fetch(`${API_URL}/catalog/cms/banners?placement=mega-menu`),
        ]);

        if (!cancelled && catsRes.ok) {
          const cats: StorefrontCategory[] = await catsRes.json();
          const tree = buildCategoryTree(
            (Array.isArray(cats) ? cats : []).filter((c) => c.showInMenu !== false),
          ).filter((c) => !c.parentId);
          setRoots(tree);
        }

        if (!cancelled && bannerRes.ok) {
          const data = await bannerRes.json();
          setBanners(Array.isArray(data) ? data : []);
        }
      } catch {
        /* menü opsiyonel */
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenId(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (roots.length === 0) return null;

  const active = roots.find((r) => r.id === openId) ?? null;
  const promo =
    (active &&
      banners.find((b) => b.categoryId === active.id)) ||
    banners.find((b) => !b.categoryId) ||
    null;

  return (
    <div className="border-t border-border bg-white" ref={panelRef}>
      {/* Mobil */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          Kategoriler
          <ChevronDown
            className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileOpen && (
          <div className="max-h-80 space-y-1 overflow-y-auto border-t border-border px-2 pb-3">
            {roots.map((root) => (
              <div key={root.id} className="py-1">
                <Link
                  href={categoryHref(root)}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  {root.name}
                </Link>
                {root.children.length > 0 && (
                  <div className="ml-3 space-y-0.5">
                    {root.children.map((child) => (
                      <Link
                        key={child.id}
                        href={categoryHref(child)}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Masaüstü */}
      <nav
        className="relative mx-auto hidden max-w-[1600px] px-4 md:block md:px-8 lg:px-12"
        onMouseLeave={() => setOpenId(null)}
      >
        <ul className="flex flex-wrap items-center gap-1">
          {roots.map((root) => {
            const isOpen = openId === root.id;
            return (
              <li key={root.id}>
                <button
                  type="button"
                  id={`${baseId}-${root.id}`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  onMouseEnter={() => setOpenId(root.id)}
                  onFocus={() => setOpenId(root.id)}
                  onClick={() => setOpenId(isOpen ? null : root.id)}
                  className={`flex items-center gap-1 border-b-2 px-3 py-3 text-sm font-medium transition ${
                    isOpen
                      ? "border-foreground text-foreground"
                      : "border-transparent text-gray-700 hover:text-foreground"
                  }`}
                >
                  {root.name}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {active && (
          <div
            role="region"
            aria-labelledby={`${baseId}-${active.id}`}
            className="absolute left-0 right-0 z-40 border-b border-gray-100 bg-white shadow-lg"
          >
            <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-6 md:px-8 lg:grid-cols-[1fr_280px] lg:px-12">
              <div>
                <Link
                  href={categoryHref(active)}
                  className="mb-4 inline-block text-sm font-semibold hover:underline"
                >
                  Tüm {active.name} ürünleri →
                </Link>

                {active.children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu kategoride alt kategori yok.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {active.children.map((child) => (
                      <Link
                        key={child.id}
                        href={categoryHref(child)}
                        className="group flex flex-col gap-2"
                        onClick={() => setOpenId(null)}
                      >
                        <div className="aspect-square overflow-hidden rounded-xl bg-gray-50">
                          {child.imageUrl ? (
                            <img
                              src={resolveMediaUrl(child.imageUrl)}
                              alt={child.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              {child.name}
                            </div>
                          )}
                        </div>
                        <span className="text-center text-sm font-medium">
                          {child.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {promo && (
                <Link
                  href={promo.linkUrl || categoryHref(active)}
                  onClick={() => setOpenId(null)}
                  className="flex flex-col overflow-hidden rounded-2xl bg-[#f5f0e8]"
                >
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-gray-900">
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p className="mt-2 text-sm text-gray-600">
                        {promo.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto aspect-[4/3] overflow-hidden">
                    <img
                      src={resolveMediaUrl(promo.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="p-4 text-sm font-medium text-gray-800">
                    Tüm Ürünleri Gör →
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
