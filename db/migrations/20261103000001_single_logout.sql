-- Auth_platform 이 끝났다고 알린 Auth 세션과 사람 단위로 끊긴 시각 — 그 전에 구운 SSO 출입증을 끊는다 (docs/spec/공통/4-데이터모델.md 「한 앱에서 로그아웃하면 다른 앱도」 문단 · S24)

-- migrate:up

-- 출입증이 24시간이면 저절로 끊기므로 25시간 지난 행은 back-channel 알림을 받을 때 지운다 (auth/sso.ts)
CREATE TABLE auth_revoked_sid (
  sid        TEXT        PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sid 없는 알림(그 사람의 세션 전부)의 iat. 이 시각 전에 구운 SSO 출입증은 끊긴다 (auth/identify.ts)
ALTER TABLE app_user ADD COLUMN sessions_valid_after TIMESTAMPTZ;

-- migrate:down

ALTER TABLE app_user DROP COLUMN IF EXISTS sessions_valid_after;
DROP TABLE IF EXISTS auth_revoked_sid;
