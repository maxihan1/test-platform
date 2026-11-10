-- Scout 챗봇 표 넷 — 대화 · 질문 · 답 조각 · 사용량 (공통/4-데이터모델 「챗봇 표」 · 도메인/챗봇 §3.14 · SCOUT-F1-03)
-- 새 표 넷은 grafana_ro 에 주지 않는다 — 대화 글은 사람이 쓴 질문이라 대시보드 재료가 아니다

-- migrate:up

-- 대화. 출입증(세션 쿠키)의 대화 키 + 프로젝트로 하나. 로그아웃 · 대화 초기화 · 24시간 지난 대화 정리가 지운다
CREATE TABLE chat_conversation (
  id          BIGSERIAL   PRIMARY KEY,
  session_key TEXT        NOT NULL,   -- 출입증 chatKey 원문의 SHA-256(hex). 원문은 쿠키 안에만 있다
  project_id  BIGINT      NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  username    TEXT        NOT NULL REFERENCES app_user(username) ON DELETE CASCADE,   -- 묻는 사람. app_user 의 키가 username 이다
  auth_sid    TEXT,                   -- SSO 출입증의 authSid — Auth back-channel 로그아웃이 이 칸으로 찾아 지운다
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),   -- sid 없는 사람 단위 로그아웃이 「끊긴 시각 전에 만든 대화」를 가른다
  touched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),   -- 질문을 넣을 때마다 고친다. 24시간 지나면 다음 열기 때 지운다
  UNIQUE (session_key, project_id)
);
CREATE INDEX ON chat_conversation (touched_at);
CREATE INDEX ON chat_conversation (username, created_at);
CREATE INDEX ON chat_conversation (auth_sid) WHERE auth_sid IS NOT NULL;

-- 질문 하나와 그 답. 동시 질문은 대화마다 1개(아래 부분 고유 색인)
CREATE TABLE chat_question (
  id              BIGSERIAL   PRIMARY KEY,
  conversation_id BIGINT      NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
  text            TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  status          TEXT        NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','DONE','STOPPED','TIMEOUT','FAILED')),
  error           TEXT,
  mcp_key_hash    TEXT,                   -- mcq_ 원문의 SHA-256. 가져갈 때 쓰고 끝나면 지운다 — 키가 RUNNING 동안만 산다
  claimed_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  last_chunk_at   TIMESTAMPTZ,            -- COALESCE(last_chunk_at, started_at) 뒤 2분 30초가 지난 RUNNING 은 읽는 자리가 TIMEOUT 으로 닫는다
  finished_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX chat_question_one_open ON chat_question (conversation_id) WHERE status IN ('QUEUED','RUNNING');
CREATE INDEX ON chat_question (status, created_at);
CREATE INDEX ON chat_question (mcp_key_hash) WHERE mcp_key_hash IS NOT NULL;

-- 답 조각. 번호가 SSE 이어 받기 번호다(Last-Event-ID). 답 글은 TEXT 조각을 이은 것이라 따로 두지 않는다
CREATE TABLE chat_chunk (
  question_id BIGINT      NOT NULL REFERENCES chat_question(id) ON DELETE CASCADE,
  seq         INTEGER     NOT NULL CHECK (seq >= 1),
  kind        TEXT        NOT NULL CHECK (kind IN ('STEP','STEP_DONE','TEXT')),
  body        TEXT        NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, seq)
);

-- 사용량. 대화가 지워져도 남는다 — 외래 키를 걸지 않는다(한도를 나중에 정할 재료 · 도메인/챗봇 §3.14 결정 11)
CREATE TABLE chat_usage (
  question_id        BIGINT      PRIMARY KEY,
  project_id         BIGINT      NOT NULL,
  username           TEXT        NOT NULL,
  status             TEXT        NOT NULL,
  tokens_input       BIGINT,
  tokens_output      BIGINT,
  tokens_cache_read  BIGINT,
  tokens_cache_write BIGINT,
  tokens_model       TEXT,
  tokens_partial     BOOLEAN,
  tool_calls         INTEGER,
  duration_ms        INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON chat_usage (project_id, created_at);

-- migrate:down

DROP TABLE IF EXISTS chat_usage;
DROP TABLE IF EXISTS chat_chunk;
DROP TABLE IF EXISTS chat_question;
DROP TABLE IF EXISTS chat_conversation;
