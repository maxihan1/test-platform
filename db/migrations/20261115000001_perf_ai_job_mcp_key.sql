-- 성능 AI 일 중 QA 리포트 남은 리스크(REPORT_RISK)에만 나는 MCP 열쇠(mcj_)의 해시 (docs/spec/공통/4-데이터모델.md 「성능 테스트 표」 perf_ai_job · 도메인/리포팅 §3.17 「남은 리스크 — AI」 · QAR-F1-08)

-- migrate:up

-- 가져갈 때 새로 나고 그 줄이 RUNNING 이 아니면 무효다 — 일 끝나면 따로 지우지 않고 줄 상태가 맡는다(authoring_request.mcp_key_hash 와 같다)
ALTER TABLE perf_ai_job ADD COLUMN mcp_key_hash TEXT UNIQUE;

-- migrate:down

ALTER TABLE perf_ai_job DROP COLUMN IF EXISTS mcp_key_hash;
