import { getNotifications } from "@/lib/notifications";

/** API hata gövdesini kullanıcıya okunabilir Türkçe metne çevirir. */
export function parseApiError(
  raw: string,
  fallback = "İşlem başarısız. Lütfen tekrar deneyin.",
): string {
  if (!raw?.trim()) return fallback;

  try {
    const data = JSON.parse(raw);

    if (typeof data === "string") return data;

    if (Array.isArray(data)) {
      const parts = data
        .map((e) => e?.description || e?.code || String(e))
        .filter(Boolean);
      if (parts.length) return parts.join(" ");
    }

    if (data?.errors) {
      const errs = data.errors;
      if (Array.isArray(errs)) {
        return (
          errs
            .map((e: { description?: string }) => e?.description || String(e))
            .filter(Boolean)
            .join(" ") || fallback
        );
      }
      return (
        Object.entries(errs)
          .flatMap(([, v]) => (Array.isArray(v) ? v : [String(v)]))
          .join(" ") || fallback
      );
    }

    return data?.detail || data?.title || data?.message || fallback;
  } catch {
    return raw.trim() || fallback;
  }
}

export async function readApiError(
  res: Response,
  fallback?: string,
): Promise<string> {
  const raw = await res.text().catch(() => "");
  return parseApiError(raw, fallback);
}

function clientNotify(
  type: "success" | "error" | "info" | "warning",
  message: string,
) {
  if (typeof window === "undefined") return;
  getNotifications()[type](message);
}

export const notify = {
  success: (message: string) => clientNotify("success", message),
  error: (message: string) => clientNotify("error", message),
  info: (message: string) => clientNotify("info", message),
  warning: (message: string) => clientNotify("warning", message),
};
