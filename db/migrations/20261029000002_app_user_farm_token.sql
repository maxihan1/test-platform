-- 사람마다 디바이스 팜 토큰을 둔다. 그 사람이 누른 실행이 이 토큰으로 폰을 빌린다 (docs/spec/공통/4-데이터모델.md 「사람마다 디바이스 팜 토큰」 문단)

-- migrate:up

-- 원문이다 — 팜에 그대로 실어야 해서 해시로는 못 쓴다. app_user 는 grafana_ro 에서 이미 막혀 있다
ALTER TABLE app_user ADD COLUMN farm_token TEXT;

-- migrate:down

ALTER TABLE app_user DROP COLUMN IF EXISTS farm_token;
