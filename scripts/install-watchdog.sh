#!/usr/bin/env bash
# Watchdog'u cron ile her 2 dakikada bir çalıştırır.
# Root veya docker grubundaki kullanıcı ile çalıştırın.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WATCHDOG="$ROOT/scripts/health-watchdog.sh"
chmod +x "$WATCHDOG"

CRON_LINE="*/2 * * * * $WATCHDOG >/dev/null 2>&1"

# Mevcut crontab'dan eski satırı çıkar, yenisini ekle
TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v 'health-watchdog.sh' >"$TMP" || true
echo "$CRON_LINE" >>"$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "Watchdog kuruldu (her 2 dk)."
echo "  Script : $WATCHDOG"
echo "  Cron   : $CRON_LINE"
echo "  Log    : /var/log/ecommerce/watchdog.log (veya ./logs/watchdog.log)"
echo ""
echo "Şimdi bir kez çalıştırılıyor..."
"$WATCHDOG"
echo "Tamam."
