-- 반영 때 겹침 검사 — 반영이 겹친 케이스(같은 tc_id · 같은 요구 번호 · 같은 이름)로 멈추면 사람이 케이스마다
-- 남긴다 · 뺀다를 고른다. 고른 것은 그 작성 실행 행에 담고 다음 반영이 가져간다 (held_input 과 같은 자리)
-- 정본은 docs/spec/도메인/작성.md 「★ 반영 때 겹침 검사」 · 칸은 공통/4-데이터모델 「작성 겹침 결정 칸」

-- migrate:up

ALTER TABLE authoring_request ADD COLUMN conflict_input JSONB;

-- migrate:down

ALTER TABLE authoring_request DROP COLUMN conflict_input;
