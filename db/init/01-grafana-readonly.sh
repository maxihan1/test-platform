#!/bin/bash
# Grafana가 붙을 읽기 전용 계정 (SPEC §9). 마이그레이션보다 먼저 돌아야 해서 postgres init 스크립트에 둔다
# 비밀번호는 compose 가 넘긴 GRAFANA_RO_PASSWORD 다 — Grafana 데이터소스도 같은 칸을 읽는다 (2026-10-23 리뷰 M17)
set -euo pipefail

# 역할은 서버에 하나다. 임시 DB 에 다시 돌릴 때 이미 있으면 만들기만 건너뛰고 아래 권한은 그 DB 에 건다
psql -v ON_ERROR_STOP=1 -v pw="$GRAFANA_RO_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE grafana_ro LOGIN PASSWORD %L', :'pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grafana_ro') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO grafana_ro', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO grafana_ro;

-- 마이그레이션이 나중에 만드는 테이블까지 자동으로 SELECT 권한이 따라가게 한다
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_ro;
SQL
