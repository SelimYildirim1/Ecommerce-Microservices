"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";

function ConfirmInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const userId = params.get("userId");
    const token = params.get("token");
    if (!userId || !token) {
      setStatus("err");
      setMessage("Geçersiz doğrulama bağlantısı.");
      return;
    }

    fetch(
      `${API_URL}/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
    )
      .then(async (res) => {
        if (res.ok) {
          setStatus("ok");
          setMessage("E-posta doğrulandı. Giriş yapabilirsiniz.");
        } else {
          setStatus("err");
          setMessage((await res.text()) || "Doğrulama başarısız.");
        }
      })
      .catch(() => {
        setStatus("err");
        setMessage("Bağlantı hatası.");
      });
  }, [params]);

  return (
    <p className={`text-sm ${status === "err" ? "text-red-600" : "text-muted-foreground"}`}>
      {status === "loading" ? "Doğrulanıyor..." : message}
    </p>
  );
}

export default function ConfirmEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <h1 className="font-display text-3xl font-bold">E-posta doğrulama</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Yükleniyor...</p>}>
          <ConfirmInner />
        </Suspense>
        <Link href="/login" className="text-sm text-muted-foreground underline">
          Girişe git
        </Link>
      </div>
    </main>
  );
}
