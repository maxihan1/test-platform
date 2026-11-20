-- 게임 실패 자동 수정 기록 — 테스트 수정 바퀴 기록 표를 넓혀 이슈 없는 줄을 받는다 (도메인/게임 §3.10 「실패 자동 수정」 8 · 공통/4-데이터모델 「BTS 연동 표」 · GAME-F5-12)
-- issue_key 가 NULL 인 줄이 게임 실패 자동 수정이다 — 서버가 조작 실패로 스스로 세웠고 BTS 로 보내는 것이 없다
-- grafana_ro 에 아무것도 주지 않는다 — 화면 응답이 읽고 어느 패널도 안 읽는다

-- migrate:up

ALTER TABLE bts_test_fix ALTER COLUMN issue_key DROP NOT NULL;

-- 그 케이스의 조작 실패 유형 — 게임 줄만 찬다. 서랍 「요청」 줄이 보인다
ALTER TABLE bts_test_fix ADD COLUMN failure TEXT CHECK (failure IN ('notFound', 'timeout'));
-- 사람 확인이 필요한 까닭 글 — 게임 줄만 찬다. BTS 줄은 이슈 댓글로 알린다(testFixMerge.ts)
ALTER TABLE bts_test_fix ADD COLUMN person_why TEXT[] NOT NULL DEFAULT '{}';

-- 이슈가 없으면 게임 줄이다 — 실패 유형이 꼭 있다. 이슈가 있으면 실패 유형을 안 쓴다
ALTER TABLE bts_test_fix ADD CONSTRAINT bts_test_fix_origin_check CHECK ((issue_key IS NULL) = (failure IS NOT NULL));

-- FLAKY — 게임 고침이 그대로 한 번 돌려 보니 통과해 고치지 않고 끝났다(「다시 돌리니 통과」)
ALTER TABLE bts_test_fix DROP CONSTRAINT bts_test_fix_state_check;
ALTER TABLE bts_test_fix ADD CONSTRAINT bts_test_fix_state_check CHECK (state IN ('FIXING', 'WAIT_MERGE', 'RERUNNING', 'PASSED', 'FAILED', 'GAVE_UP', 'FLAKY'));

-- migrate:down

DELETE FROM bts_test_fix WHERE issue_key IS NULL;
ALTER TABLE bts_test_fix DROP CONSTRAINT bts_test_fix_state_check;
ALTER TABLE bts_test_fix ADD CONSTRAINT bts_test_fix_state_check CHECK (state IN ('FIXING', 'WAIT_MERGE', 'RERUNNING', 'PASSED', 'FAILED', 'GAVE_UP'));
ALTER TABLE bts_test_fix DROP CONSTRAINT bts_test_fix_origin_check;
ALTER TABLE bts_test_fix DROP COLUMN person_why;
ALTER TABLE bts_test_fix DROP COLUMN failure;
ALTER TABLE bts_test_fix ALTER COLUMN issue_key SET NOT NULL;
