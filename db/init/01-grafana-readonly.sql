-- Grafana가 붙을 읽기 전용 계정 (SPEC §9). 마이그레이션보다 먼저 돌아야 해서 postgres init 스크립트에 둔다

CREATE ROLE grafana_ro LOGIN PASSWORD 'grafana_ro';

GRANT CONNECT ON DATABASE platform TO grafana_ro;
GRANT USAGE ON SCHEMA public TO grafana_ro;

-- 마이그레이션이 나중에 만드는 테이블까지 자동으로 SELECT 권한이 따라가게 한다
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_ro;
