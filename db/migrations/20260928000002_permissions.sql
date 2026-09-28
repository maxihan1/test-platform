-- 등급 셋을 기능별 권한으로 — 서비스마다 칸 셋 · 사람마다 대시보드 칸 · 가입 승인 · 비밀번호 변경 강제 (docs/spec/공통/4-데이터모델.md §6 · 도메인/인증.md §7 「옛 등급에서 옮긴 값」)

-- migrate:up

-- 옛 행을 채우는 기본값으로 먼저 더한다 — 이미 쓰던 사람을 가입 대기로 돌리거나 다시 바꾸게 하지 않는다
ALTER TABLE app_user
  ADD COLUMN perm_dashboard TEXT NOT NULL DEFAULT 'read' CHECK (perm_dashboard IN ('none', 'read')),
  ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
-- 'read' 로 채워야 아래 셋-다-none CHECK 를 옛 배정 행이 지난다
ALTER TABLE user_service
  ADD COLUMN perm_cases TEXT NOT NULL DEFAULT 'read' CHECK (perm_cases IN ('none', 'read', 'write')),
  ADD COLUMN perm_runs TEXT NOT NULL DEFAULT 'read' CHECK (perm_runs IN ('none', 'read', 'write')),
  ADD COLUMN perm_authoring TEXT NOT NULL DEFAULT 'read' CHECK (perm_authoring IN ('none', 'read', 'write'));

-- 이 구간은 이름을 한정하지 않는다 — 검사가 옛 모양의 임시 표에 그대로 돌린다 (apps/admin/src/db/permissions-columns.test.ts)
-- 옮기기 시작
-- admin 도 write 로 채운다 — admin 은 칸을 안 보지만 member 로 내렸을 때 할 일이 줄지 않게
UPDATE user_service SET perm_cases = 'write', perm_runs = 'write', perm_authoring = 'write'
 WHERE username IN (SELECT username FROM app_user WHERE role IN ('operator', 'admin'));
UPDATE app_user SET role = 'member' WHERE role IN ('viewer', 'operator');
-- 옮기기 끝

-- 지금까지 role 에는 CHECK 가 없었다
ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('member', 'admin'));
ALTER TABLE app_user ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE user_service ADD CONSTRAINT user_service_perm_check
  CHECK (perm_cases <> 'none' OR perm_runs <> 'none' OR perm_authoring <> 'none');

-- 새 행은 가장 좁은 쪽 — 빠뜨리면 모자라서 그 자리에서 드러난다
ALTER TABLE app_user ALTER COLUMN perm_dashboard SET DEFAULT 'none';
ALTER TABLE app_user ALTER COLUMN is_approved SET DEFAULT false;
ALTER TABLE app_user ALTER COLUMN must_change_password SET DEFAULT true;
ALTER TABLE user_service ALTER COLUMN perm_cases SET DEFAULT 'none';
ALTER TABLE user_service ALTER COLUMN perm_runs SET DEFAULT 'none';
ALTER TABLE user_service ALTER COLUMN perm_authoring SET DEFAULT 'none';

-- grafana_ro 에 아무것도 주지 않는다. app_user 는 REVOKE ALL, user_service 는 2026-09-17 에 기본 허용을 껐다

-- migrate:down

ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
-- 배정이 하나 이상이고 전부 셋 다 write 인 member 만 operator — 아니면 할 일이 늘어난다
UPDATE app_user u SET role = CASE
    WHEN EXISTS (SELECT 1 FROM user_service s WHERE s.username = u.username)
     AND NOT EXISTS (SELECT 1 FROM user_service s WHERE s.username = u.username
                      AND (s.perm_cases <> 'write' OR s.perm_runs <> 'write' OR s.perm_authoring <> 'write'))
    THEN 'operator' ELSE 'viewer' END
 WHERE role = 'member';
ALTER TABLE app_user ALTER COLUMN role SET DEFAULT 'viewer';
ALTER TABLE user_service DROP CONSTRAINT IF EXISTS user_service_perm_check;
ALTER TABLE user_service DROP COLUMN IF EXISTS perm_authoring;
ALTER TABLE user_service DROP COLUMN IF EXISTS perm_runs;
ALTER TABLE user_service DROP COLUMN IF EXISTS perm_cases;
ALTER TABLE app_user DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE app_user DROP COLUMN IF EXISTS is_approved;
ALTER TABLE app_user DROP COLUMN IF EXISTS perm_dashboard;
