-- 실행 하나에 한 종류 — test_run.kind 를 UI · FN · SCENARIO 로 가르고 옛 CASE 실행을 지운다 (2026-10-02 사용자 · PR #131)
-- 정본은 docs/spec/공통/4-데이터모델.md 「실행 종류」 · 도메인/작성 §3.6 「★ 테스트 두 갈래」
-- 기본값은 FN 이다 — 옛 꼴 번호를 기능으로 보는 규칙(catalog/rules.ts tcId종류)과 같고, 서버는 만들 때 늘 종류를 적는다
-- 되돌려도 지운 실행은 돌아오지 않는다. 디스크의 스크린샷 · 증적 파일은 남는다 (docs/SETUP.md)

-- migrate:up

DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE kind = 'CASE');
DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE kind = 'CASE');
DELETE FROM test_run WHERE kind = 'CASE';

ALTER TABLE test_run DROP CONSTRAINT test_run_kind_check;
ALTER TABLE test_run ALTER COLUMN kind SET DEFAULT 'FN';
ALTER TABLE test_run ADD CONSTRAINT test_run_kind_check CHECK (kind IN ('UI','FN','SCENARIO'));

-- migrate:down

ALTER TABLE test_run DROP CONSTRAINT test_run_kind_check;
UPDATE test_run SET kind = 'CASE' WHERE kind IN ('UI','FN');
ALTER TABLE test_run ALTER COLUMN kind SET DEFAULT 'CASE';
ALTER TABLE test_run ADD CONSTRAINT test_run_kind_check CHECK (kind IN ('CASE','SCENARIO'));
