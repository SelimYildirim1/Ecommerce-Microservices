#!/bin/bash
# =============================================================
#  Sadece PostgreSQL Port Forward
# =============================================================
# port-forward.sh zaten calisiyorsa 5434 mesgul olur.
# Bu script 5435 portunu kullanir - DBeaver icin alternatif:
#   Host: localhost, Port: 5435, User: postgres, Password: postgres
#
# Kullanim: ./k8s/port-forward-postgres.sh
# Durdurmak: Ctrl+C
# =============================================================

echo "PostgreSQL port-forward: localhost:5435 -> postgres-db:5432"
echo "DBeaver: Host=localhost, Port=5435, User=postgres, Password=postgres"
echo "Durdurmak icin: Ctrl+C"
echo ""

kubectl port-forward svc/postgres-db 5435:5432 -n ecommerce
