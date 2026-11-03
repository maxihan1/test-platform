-- 프로젝트 권한의 실행 칸에 넷째 값 trial(보기 + 테스트 모드)을 더한다 (docs/spec/도메인/인증.md §3.5 「테스트 모드」 · §7 블록 · TMO-F5-01)
-- 글자 차례 none < read < trial < write 가 칸 높이 차례와 같다 — 옮기기 마이그레이션의 max 규칙이 그대로 맞는다

-- migrate:up

ALTER TABLE user_project DROP CONSTRAINT user_project_perm_runs_check;
ALTER TABLE user_project ADD CONSTRAINT user_project_perm_runs_check CHECK (perm_runs IN ('none','read','trial','write'));

-- migrate:down

-- trial 줄은 read 로 내린다 — 테스트 모드만 빠지고 보기는 남는다
UPDATE user_project SET perm_runs = 'read' WHERE perm_runs = 'trial';
ALTER TABLE user_project DROP CONSTRAINT user_project_perm_runs_check;
ALTER TABLE user_project ADD CONSTRAINT user_project_perm_runs_check CHECK (perm_runs IN ('none','read','write'));
