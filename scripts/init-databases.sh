#!/bin/bash
# Docker Compose PostgreSQL init script
# CatalogDb POSTGRES_DB ile otomatik oluşturulur.
# IdentityDb ve OrderDb bu script ile oluşturulur.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
  CREATE DATABASE "IdentityDb";
  CREATE DATABASE "OrderDb";
EOSQL
