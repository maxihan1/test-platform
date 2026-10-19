-- 앱 항목을 돌린 폰 · 앱의 판 (공통/4-데이터모델 「기기 칸」 · APP-F1-05)
-- 칸은 run_item 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- { model, osVersion, appVersion } — 못 읽은 칸은 null. 브라우저 항목과 연결이 안 열린 앱 항목은 NULL 이다
ALTER TABLE run_item ADD COLUMN device JSONB CHECK (device IS NULL OR jsonb_typeof(device) = 'object');

-- migrate:down

ALTER TABLE run_item DROP COLUMN IF EXISTS device;
