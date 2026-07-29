"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Bir şeyler ters gitti</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Beklenmeyen bir hata oluştu."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm text-white"
      >
        Tekrar dene
      </button>
    </main>
  );
}
