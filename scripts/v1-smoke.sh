#!/usr/bin/env bash
# =============================================================
#  V1 production smoke tests — eticaret.yildirimsoft.com.tr
# =============================================================
# Kullanım:
#   ./scripts/v1-smoke.sh
#   BASE_URL=https://eticaret.yildirimsoft.com.tr ./scripts/v1-smoke.sh
# =============================================================

set -uo pipefail

BASE="${BASE_URL:-https://eticaret.yildirimsoft.com.tr}"
GW="${GATEWAY_URL:-$BASE/gateway}"
pass=0
fail=0
warnings=0

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

ok() { green "  PASS  $*"; pass=$((pass + 1)); }
bad() { red "  FAIL  $*"; fail=$((fail + 1)); }
warn() { yellow "  WARN  $*"; warnings=$((warnings + 1)); }

http_code() {
  curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 --max-time 25 "$@"
}

json_has() {
  python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if ($1) else 1)" 2>/dev/null
}

echo "=== V1 Smoke — $BASE ==="
echo ""

# --- Public pages ---
echo "[Pages]"
for path in "/" "/products" "/cart" "/checkout" "/login" "/account" "/sss" "/iletisim" "/offline"; do
  code="$(http_code -L "$BASE$path")"
  if [[ "$code" == "200" ]]; then ok "GET $path ($code)"
  elif [[ "$path" == "/account" && ( "$code" == "307" || "$code" == "302" || "$code" == "200" ) ]]; then ok "GET $path ($code)"
  else bad "GET $path ($code)"; fi
done

# --- API health via gateway ---
echo ""
echo "[Gateway / Health]"
code="$(http_code "$GW/health")"
[[ "$code" == "200" ]] && ok "gateway /health" || bad "gateway /health ($code)"

# Catalog search
body="$(curl -s --max-time 25 "$GW/catalog/products/search?page=1&pageSize=4" || true)"
echo "$body" | json_has "'items' in d or isinstance(d, list)" \
  && ok "catalog search" || bad "catalog search"

# Brands
code="$(http_code "$GW/catalog/brands")"
[[ "$code" == "200" ]] && ok "catalog brands" || bad "catalog brands ($code)"

# Popular searches
code="$(http_code "$GW/catalog/products/popular-searches?take=5")"
[[ "$code" == "200" ]] && ok "popular searches" || warn "popular searches ($code) — migration gerekebilir"

# Deals / bestsellers
code="$(http_code "$GW/catalog/products/deals?take=4")"
[[ "$code" == "200" ]] && ok "deals" || bad "deals ($code)"
code="$(http_code "$GW/catalog/products/bestsellers?take=4")"
[[ "$code" == "200" ]] && ok "bestsellers" || bad "bestsellers ($code)"

# Currencies
code="$(http_code "$GW/catalog/currencies")"
[[ "$code" == "200" ]] && ok "currencies" || warn "currencies ($code)"

# CMS pages for checkout modals
for slug in kvkk mesafeli-satis-sozlesmesi; do
  code="$(http_code "$GW/catalog/cms/pages/$slug")"
  [[ "$code" == "200" ]] && ok "cms page /$slug" || warn "cms page /$slug ($code)"
done

# Campaigns / coupons featured
code="$(http_code "$GW/promotions/campaigns/active?take=3")"
[[ "$code" == "200" ]] && ok "active campaigns" || warn "active campaigns ($code)"
code="$(http_code "$GW/promotions/coupons/featured?take=3")"
[[ "$code" == "200" ]] && ok "featured coupons" || warn "featured coupons ($code)"

# Categories
code="$(http_code "$GW/catalog/categories")"
[[ "$code" == "200" ]] && ok "categories" || bad "categories ($code)"

# PWA
echo ""
echo "[PWA]"
code="$(http_code "$BASE/manifest.webmanifest")"
[[ "$code" == "200" ]] && ok "manifest" || warn "manifest ($code)"
code="$(http_code "$BASE/sw.js")"
[[ "$code" == "200" ]] && ok "service worker" || warn "sw.js ($code)"

# Auth endpoints exist
echo ""
echo "[Auth]"
code="$(http_code -X POST -H 'Content-Type: application/json' -d '{}' "$GW/auth/login")"
# 400/401 expected for empty body — not 404/502
if [[ "$code" == "400" || "$code" == "401" || "$code" == "200" ]]; then ok "auth login endpoint ($code)"
else bad "auth login endpoint ($code)"; fi

echo ""
echo "=== Sonuç: $pass geçti, $fail başarısız, $warnings uyarı ==="
[[ "$fail" -eq 0 ]]
