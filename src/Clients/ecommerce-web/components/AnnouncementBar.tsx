import { getSiteSettings } from "@/lib/cms";

/**
 * Üst slogan şeridi — admin Ayarlar > Site bilgileri:
 * site.announcement + site.announcementEnabled
 * Sağdan sola sonsuz kayma (CSS).
 */
export default async function AnnouncementBar() {
  const settings = await getSiteSettings();
  const enabled = (settings["site.announcementEnabled"] ?? "true") !== "false";
  const text = (settings["site.announcement"] ?? "").trim();

  if (!enabled || !text) return null;

  // Kesintisiz döngü için metni birkaç kez tekrarla
  const segment = `${text}  ·  `;
  const loop = Array.from({ length: 8 }, () => segment).join("");

  return (
    <div
      className="announcement-bar border-b border-border bg-white text-foreground"
      role="region"
      aria-label="Duyuru"
    >
      <div className="announcement-viewport overflow-hidden">
        <div className="announcement-track" aria-hidden="true">
          <span className="announcement-text">{loop}</span>
          <span className="announcement-text">{loop}</span>
        </div>
        <span className="sr-only">{text}</span>
      </div>
    </div>
  );
}
