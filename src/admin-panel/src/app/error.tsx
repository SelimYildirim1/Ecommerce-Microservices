"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Bir hata oluştu</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Beklenmeyen bir hata nedeniyle sayfa yüklenemedi."}
      </p>
      <Button onClick={reset}>Tekrar dene</Button>
    </div>
  );
}
