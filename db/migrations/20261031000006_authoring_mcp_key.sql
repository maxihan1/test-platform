-- 작성 요청마다 나는 MCP 열쇠(mcj_)의 해시 (docs/spec/공통/4-데이터모델.md §6 「BTS 연동 표」 BTS-F4-02)

-- migrate:up

-- 집을 때 새로 나고 그 줄이 RUNNING 이 아니면 무효다 — 일 끝나면 따로 지우지 않고 줄 상태가 맡는다(도메인/BTS 결정 20)
ALTER TABLE authoring_request ADD COLUMN mcp_key_hash TEXT UNIQUE;

-- migrate:down

ALTER TABLE authoring_request DROP COLUMN IF EXISTS mcp_key_hash;
