-- 애플리케이션 종류에 Android 앱(APP)을 더하고 이미 앱인 화면 애플리케이션을 한 번 옮긴다 (docs/spec/공통/4-데이터모델.md 「애플리케이션 종류 APP」 · APP-F1-15)

-- migrate:up

ALTER TABLE service DROP CONSTRAINT service_kind_check;
ALTER TABLE service ADD CONSTRAINT service_kind_check CHECK (kind IN ('SCREEN', 'APP', 'API'));

-- 옮기기 시작
-- android 가 아닌 케이스가 없고, android 케이스가 있거나 대상 서버 줄에 앱 파일 경로가 있는 SCREEN 행 (도메인/러너 §5.2 결정 5).
-- test_case 는 서비스 번호가 없어 tc_id 접두사로 짚는다(설정 목록 caseCount 와 같은 짝짓기 — apps/admin/src/settings/store.ts).
-- caseCount 와 달리 꺼진 케이스도 센다 — 꺼 둔 웹 케이스가 있으면 웹이다
UPDATE service s SET kind = 'APP'
 WHERE s.kind = 'SCREEN'
   AND NOT EXISTS (SELECT 1 FROM test_case c WHERE c.tc_id LIKE s.prefix || '-%' AND c.platforms <> '["android"]'::jsonb)
   AND (EXISTS (SELECT 1 FROM test_case c WHERE c.tc_id LIKE s.prefix || '-%')
        OR EXISTS (SELECT 1 FROM service_env e WHERE e.service_id = s.id AND coalesce(e.app_path, '') <> ''));
-- 옮기기 끝

-- migrate:down

-- 남은 APP 행이 있으면 옛 제약을 못 건다
UPDATE service SET kind = 'SCREEN' WHERE kind = 'APP';
ALTER TABLE service DROP CONSTRAINT service_kind_check;
ALTER TABLE service ADD CONSTRAINT service_kind_check CHECK (kind IN ('SCREEN', 'API'));
