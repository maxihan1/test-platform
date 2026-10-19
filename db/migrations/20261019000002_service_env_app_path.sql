-- 대상 서버마다 다른 Android 앱 파일 경로 (공통/4-데이터모델 「앱 파일 경로」 · APP-F1-03)
-- 칸은 service_env 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 러너가 도는 컴퓨터 기준 경로다. NULL 이면 러너 환경값 PLATFORM_APP 을 쓴다 — 줄마다 다 채우지 않아도 지금처럼 돈다
ALTER TABLE service_env ADD COLUMN app_path TEXT;

-- migrate:down

ALTER TABLE service_env DROP COLUMN IF EXISTS app_path;
