import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Props {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}

/** Vitrindeki bolum basligi ve saga hizali "tumunu gor" baglantisi. */
export default function SectionHeader({ title, actionLabel, actionHref }: Props) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>

      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
