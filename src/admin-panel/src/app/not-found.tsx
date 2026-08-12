import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Button asChild>
        <Link href="/dashboard">Dashboard&apos;a dön</Link>
      </Button>
    </div>
  );
}
