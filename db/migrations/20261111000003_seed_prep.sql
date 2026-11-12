-- 대상 서버 줄의 테스트 데이터 준비 주소 · 실행의 준비 실패 까닭 (공통/4-데이터모델 「준비 주소 칸」 SEED-F1-02 · 도메인/실행 §3.2 「실행 전 준비」)
-- test_run.status 는 CHECK 없는 TEXT 라 PREP_FAILED 는 칸 변경 없이 값만 는다. 그 값을 쓰는 코드는 SEED-F1-03
-- grafana_ro 에 service_env 는 원래 안 준다. prep_note 는 test_run 과 같이 읽히므로 가린 뒤에만 넣는다(SEED-F1-03)

-- migrate:up

-- { url, header, value, timeoutSec } 원문 — 설정 응답은 값 끝 4자리만 싣는다. NULL 이면 준비를 안 부른다. 실서비스 서버 줄은 저장이 400 PREP_ON_PROD 로 막는다
ALTER TABLE service_env ADD COLUMN prep JSONB;

-- 준비 실패 까닭 한 줄. 준비에 성공했거나 준비 주소가 없으면 NULL
ALTER TABLE test_run ADD COLUMN prep_note TEXT;

-- migrate:down

ALTER TABLE test_run DROP COLUMN prep_note;
ALTER TABLE service_env DROP COLUMN prep;
