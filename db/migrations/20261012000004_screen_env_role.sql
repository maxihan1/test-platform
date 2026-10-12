-- 화면 기록 · 찾은 화면 · 화면 연결 열쇠에 대상 서버(env)와 로그인 역할 (진행판 PRD-F9-29 · 30)
-- 열쇠 · 칸 · 옛 줄 옮기기는 「화면 기록 열쇠에 대상 서버 · 역할 · 지도 ② 화면 이름」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 대상 서버 — 피처 플래그가 다른 qa 와 운영의 같은 화면이 한 칸에서 서로 덮어쓰지 않게.
-- 옛 줄은 그 서비스의 마지막 대조 요청 서버다(화면 기록은 대조 · 화면만만 쓴다). 대조가 없는 서비스 줄은 어느 서버 것인지 몰라 지운다 — 다음 작성이 다시 훑는다
ALTER TABLE screen_record ADD COLUMN env TEXT;
ALTER TABLE screen_found ADD COLUMN env TEXT;
ALTER TABLE screen_link ADD COLUMN env TEXT;

CREATE TEMP TABLE 마지막대조 ON COMMIT DROP AS
  SELECT DISTINCT ON (service_id) service_id, env
    FROM authoring_request
   WHERE compare AND env IS NOT NULL
   ORDER BY service_id, id DESC;
UPDATE screen_record t SET env = m.env FROM 마지막대조 m WHERE m.service_id = t.service_id;
UPDATE screen_found t SET env = m.env FROM 마지막대조 m WHERE m.service_id = t.service_id;
UPDATE screen_link t SET env = m.env FROM 마지막대조 m WHERE m.service_id = t.service_id;
DELETE FROM screen_record WHERE env IS NULL;
DELETE FROM screen_found WHERE env IS NULL;
DELETE FROM screen_link WHERE env IS NULL;
ALTER TABLE screen_record ALTER COLUMN env SET NOT NULL;
ALTER TABLE screen_found ALTER COLUMN env SET NOT NULL;
ALTER TABLE screen_link ALTER COLUMN env SET NOT NULL;

-- 상태에 역할 — 「로그인」 하나면 일반 회원과 관리자가 본 같은 화면이 한 칸에 섞인다. 옛 「로그인」은 일반 회원 계정으로 돈 것이다
-- 역할 이름은 대상 서버 줄의 역할 규칙(앞뒤 공백 없음 · 40자 이하)을 따른다 — 서버 settings/roles.ts 와 같다
ALTER TABLE screen_record DROP CONSTRAINT screen_record_state_check;
ALTER TABLE screen_found DROP CONSTRAINT screen_found_state_check;
ALTER TABLE screen_link DROP CONSTRAINT screen_link_state_check;
UPDATE screen_record SET state = '로그인:일반 회원' WHERE state = '로그인';
UPDATE screen_found SET state = '로그인:일반 회원' WHERE state = '로그인';
UPDATE screen_link SET state = '로그인:일반 회원' WHERE state = '로그인';
ALTER TABLE screen_record ADD CONSTRAINT screen_record_state_check
  CHECK (state = '로그아웃' OR state ~ '^로그인:[^[:space:]](.{0,38}[^[:space:]])?$');
ALTER TABLE screen_found ADD CONSTRAINT screen_found_state_check
  CHECK (state = '로그아웃' OR state ~ '^로그인:[^[:space:]](.{0,38}[^[:space:]])?$');
ALTER TABLE screen_link ADD CONSTRAINT screen_link_state_check
  CHECK (state = '로그아웃' OR state ~ '^로그인:[^[:space:]](.{0,38}[^[:space:]])?$');

ALTER TABLE screen_record DROP CONSTRAINT screen_record_pkey, ADD PRIMARY KEY (service_id, env, state, url);
ALTER TABLE screen_found DROP CONSTRAINT screen_found_pkey, ADD PRIMARY KEY (service_id, env, state, url);
ALTER TABLE screen_link DROP CONSTRAINT screen_link_pkey, ADD PRIMARY KEY (service_id, env, state, from_url, to_url, via);

-- migrate:down

-- 옛 열쇠로 돌리면 서버 · 역할이 겹친 줄이 부딪힌다 — 일반 회원 밖 역할은 지우고, 서버가 여럿이면 이름이 앞선 하나만 남긴다
DELETE FROM screen_record WHERE state LIKE '로그인:%' AND state <> '로그인:일반 회원';
DELETE FROM screen_found WHERE state LIKE '로그인:%' AND state <> '로그인:일반 회원';
DELETE FROM screen_link WHERE state LIKE '로그인:%' AND state <> '로그인:일반 회원';
DELETE FROM screen_record a USING screen_record b
 WHERE a.service_id = b.service_id AND a.state = b.state AND a.url = b.url AND a.env > b.env;
DELETE FROM screen_found a USING screen_found b
 WHERE a.service_id = b.service_id AND a.state = b.state AND a.url = b.url AND a.env > b.env;
DELETE FROM screen_link a USING screen_link b
 WHERE a.service_id = b.service_id AND a.state = b.state AND a.from_url = b.from_url AND a.to_url = b.to_url AND a.via = b.via AND a.env > b.env;
ALTER TABLE screen_record DROP CONSTRAINT screen_record_pkey, ADD PRIMARY KEY (service_id, state, url);
ALTER TABLE screen_found DROP CONSTRAINT screen_found_pkey, ADD PRIMARY KEY (service_id, state, url);
ALTER TABLE screen_link DROP CONSTRAINT screen_link_pkey, ADD PRIMARY KEY (service_id, state, from_url, to_url, via);
ALTER TABLE screen_record DROP CONSTRAINT screen_record_state_check;
ALTER TABLE screen_found DROP CONSTRAINT screen_found_state_check;
ALTER TABLE screen_link DROP CONSTRAINT screen_link_state_check;
UPDATE screen_record SET state = '로그인' WHERE state = '로그인:일반 회원';
UPDATE screen_found SET state = '로그인' WHERE state = '로그인:일반 회원';
UPDATE screen_link SET state = '로그인' WHERE state = '로그인:일반 회원';
ALTER TABLE screen_record ADD CONSTRAINT screen_record_state_check CHECK (state IN ('로그아웃','로그인'));
ALTER TABLE screen_found ADD CONSTRAINT screen_found_state_check CHECK (state IN ('로그아웃','로그인'));
ALTER TABLE screen_link ADD CONSTRAINT screen_link_state_check CHECK (state IN ('로그아웃','로그인'));
ALTER TABLE screen_record DROP COLUMN env;
ALTER TABLE screen_found DROP COLUMN env;
ALTER TABLE screen_link DROP COLUMN env;
