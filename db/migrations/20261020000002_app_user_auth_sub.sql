-- app_user 를 Auth_platform 계정(sub)에 묶는다. maxihan 계정으로 들어온 사람은 비밀번호가 없다 (docs/spec/도메인/인증.md §3.5 「maxihan 계정」)

-- migrate:up

-- sub 는 Auth_platform 의 사용자 id(UUID)다. username 은 바뀌거나 다시 쓰일 수 있어 묶는 열쇠로 쓰지 않는다
ALTER TABLE app_user ADD COLUMN auth_sub TEXT UNIQUE;
ALTER TABLE app_user ALTER COLUMN password_hash DROP NOT NULL;

-- migrate:down

-- 비밀번호 없는 행이 남아 있으면 NOT NULL 로 되돌릴 수 없다 — 그 행을 먼저 정리해야 한다
ALTER TABLE app_user ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE app_user DROP COLUMN IF EXISTS auth_sub;
