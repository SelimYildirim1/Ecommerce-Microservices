interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" } as const;

/** Yarim yildiz destekli, salt okunur puan gostergesi. */
export default function StarRating({ value, size = "sm", className = "" }: Props) {
  const sizeClass = SIZES[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - star + 1));

        return (
          <span key={star} className={`relative inline-block ${sizeClass}`}>
            <Star className={`${sizeClass} text-border absolute inset-0`} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={`${sizeClass} text-amber-400`} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.25l2.955 5.988 6.608.96-4.782 4.66 1.129 6.582L12 17.34l-5.91 3.1 1.129-6.58-4.782-4.66 6.608-.96L12 2.25z" />
    </svg>
  );
}
