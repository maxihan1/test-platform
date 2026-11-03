-- 사람이 붙여 넣던 Auth PAT 원문 두 칸을 지우고 BTS 「QA Hub AI」 계정 이름을 둔다 (docs/spec/공통/4-데이터모델.md 「붙여 넣은 PAT 두 칸을 지운다」 문단 · S25)

-- migrate:up

-- admin 이 그때그때 Auth 대신 PAT 를 받는다(apps/admin/src/auth/delegatedPat.ts). 지운 원문은 Auth 「내 계정」에서 폐기한다
ALTER TABLE app_user DROP COLUMN IF EXISTS farm_token;

-- 비밀이 아니다 — 부를 때마다 이 이름의 대신 PAT 를 받는다. 이미 이은 연결은 NULL 이라 설정 화면에서 적을 때까지 BTS 를 못 부른다
ALTER TABLE bts_link ADD COLUMN bot_username TEXT;
ALTER TABLE bts_link DROP COLUMN bot_key;

-- migrate:down

-- 지운 원문은 돌아오지 않는다 — 칸만 되살리고 BTS 연결은 다시 열쇠를 넣어야 한다
ALTER TABLE bts_link ADD COLUMN bot_key TEXT NOT NULL DEFAULT '';
ALTER TABLE bts_link ALTER COLUMN bot_key DROP DEFAULT;
ALTER TABLE bts_link DROP COLUMN IF EXISTS bot_username;
ALTER TABLE app_user ADD COLUMN farm_token TEXT;
