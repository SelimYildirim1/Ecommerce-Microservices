"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-gray-900 antialiased">
        <h1 className="text-3xl font-bold">Kritik hata</h1>
        <p className="max-w-md text-sm text-gray-500">
          {error.message || "Beklenmeyen bir hata oluştu."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white"
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
