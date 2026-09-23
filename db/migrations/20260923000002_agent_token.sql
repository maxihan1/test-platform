-- SPEC §6 app_user.agent_token_hash — 작성 에이전트가 비밀번호 대신 쓰는 토큰의 해시 (도메인/인증 §7)
-- 본문은 §6의 SQL 예시를 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

ALTER TABLE app_user ADD COLUMN agent_token_hash TEXT;

-- 해시로 사람을 찾으므로 둘이 같은 값을 가지면 누구인지 갈리지 않는다. 토큰이 없는 계정(NULL)은 여럿이어도 된다
CREATE UNIQUE INDEX app_user_agent_token_hash ON app_user (agent_token_hash) WHERE agent_token_hash IS NOT NULL;

-- migrate:down

DROP INDEX app_user_agent_token_hash;
ALTER TABLE app_user DROP COLUMN agent_token_hash;
