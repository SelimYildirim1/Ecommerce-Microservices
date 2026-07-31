/**
 * Global Notification System — sağ üst toast (success/error/warning/info).
 * Tarayıcı alert() yerine kullanılır.
 */

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  type?: NotificationType;
  duration?: number;
  closable?: boolean;
  showProgress?: boolean;
  clickToClose?: boolean;
}

type InternalConfig = Required<
  Pick<NotificationOptions, "type" | "duration" | "closable" | "showProgress">
> &
  Pick<NotificationOptions, "clickToClose">;

const DEFAULTS: InternalConfig = {
  type: "info",
  duration: 5000,
  closable: true,
  showProgress: true,
};

const ICONS: Record<NotificationType, string> = {
  success: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
};

const TITLES: Record<NotificationType, string> = {
  success: "Başarılı",
  error: "Hata",
  warning: "Uyarı",
  info: "Bilgi",
};

class NotificationSystem {
  private container: HTMLElement | null = null;
  private notifications = new Map<
    string,
    { element: HTMLElement; config: InternalConfig; timer?: number }
  >();
  private escapeBound = false;

  init() {
    if (typeof document === "undefined") return;
    this.createContainer();
    if (!this.escapeBound) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.closeAll();
      });
      this.escapeBound = true;
    }
  }

  private createContainer() {
    this.container = document.getElementById("notification-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.className = "notification-container";
      document.body.appendChild(this.container);
    }
  }

  show(message: string, options: NotificationOptions = {}): string {
    this.init();
    if (!this.container) return "";

    const config: InternalConfig = { ...DEFAULTS, ...options };
    const id = this.generateId();
    const element = this.createNotification(id, message, config);
    this.container.appendChild(element);
    this.notifications.set(id, { element, config });

    if (config.duration > 0) this.scheduleRemoval(id, config.duration);
    return id;
  }

  success(message: string, options: NotificationOptions = {}) {
    return this.show(message, { ...options, type: "success" });
  }

  error(message: string, options: NotificationOptions = {}) {
    return this.show(message, { ...options, type: "error" });
  }

  warning(message: string, options: NotificationOptions = {}) {
    return this.show(message, { ...options, type: "warning" });
  }

  info(message: string, options: NotificationOptions = {}) {
    return this.show(message, { ...options, type: "info" });
  }

  close(id: string) {
    this.removeNotification(id);
  }

  closeAll() {
    [...this.notifications.keys()].forEach((id) => this.removeNotification(id));
  }

  clear() {
    this.notifications.forEach(({ element, timer }) => {
      if (timer) window.clearTimeout(timer);
      element.remove();
    });
    this.notifications.clear();
  }

  private createNotification(
    id: string,
    message: string,
    config: InternalConfig,
  ): HTMLElement {
    const notification = document.createElement("div");
    notification.className = `notification notification-${config.type}`;
    notification.dataset.id = id;

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${ICONS[config.type]}</div>
        <div class="notification-body">
          <div class="notification-title">${TITLES[config.type]}</div>
          <div class="notification-message">${this.escapeHtml(message)}</div>
        </div>
      </div>
      ${
        config.closable
          ? `<button type="button" class="notification-close" aria-label="Kapat">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>`
          : ""
      }
      ${
        config.showProgress && config.duration > 0
          ? `<div class="notification-progress"><div class="notification-progress-bar" style="width:100%"></div></div>`
          : ""
      }
    `;

    const closeBtn = notification.querySelector(".notification-close");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close(id);
    });

    if (config.clickToClose) {
      notification.addEventListener("click", () => this.close(id));
    }

    return notification;
  }

  private scheduleRemoval(id: string, duration: number) {
    const entry = this.notifications.get(id);
    if (!entry) return;

    const progressBar = entry.element.querySelector(
      ".notification-progress-bar",
    ) as HTMLElement | null;
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.width = "0%";
      });
    }

    entry.timer = window.setTimeout(() => this.removeNotification(id), duration);
  }

  private removeNotification(id: string) {
    const entry = this.notifications.get(id);
    if (!entry) return;
    if (entry.timer) window.clearTimeout(entry.timer);

    entry.element.classList.add("removing");
    window.setTimeout(() => {
      entry.element.remove();
      this.notifications.delete(id);
    }, 300);
  }

  private generateId() {
    return `notification_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
  }

  private escapeHtml(text: string) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

const notifications = new NotificationSystem();

export function getNotifications(): NotificationSystem {
  if (typeof window !== "undefined") {
    (window as unknown as { Notifications: NotificationSystem }).Notifications =
      notifications;
  }
  return notifications;
}

export default notifications;
