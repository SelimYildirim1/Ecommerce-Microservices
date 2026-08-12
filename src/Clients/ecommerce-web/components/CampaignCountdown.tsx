"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export default function CampaignCountdown({
  endsAt,
  className = "",
}: {
  endsAt: string;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (remaining <= 0) {
    return <span className={`text-sm text-gray-500 ${className}`}>Kampanya sona erdi</span>;
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;

  return (
    <div className={`flex items-center gap-2 font-mono text-sm tabular-nums ${className}`}>
      {days > 0 && (
        <span className="rounded-md bg-foreground px-2 py-1 text-white">{days}g</span>
      )}
      <span className="rounded-md bg-foreground px-2 py-1 text-white">{pad(hours)}</span>
      <span className="text-gray-400">:</span>
      <span className="rounded-md bg-foreground px-2 py-1 text-white">{pad(mins)}</span>
      <span className="text-gray-400">:</span>
      <span className="rounded-md bg-foreground px-2 py-1 text-white">{pad(secs)}</span>
    </div>
  );
}
