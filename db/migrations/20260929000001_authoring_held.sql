-- 작성 보류 입력 — 사람이 보류 케이스에 넣은 값 · 제거 표시
-- 본문은 「작성 보류 입력 칸」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 모양은 서버가 가둔다(도메인/작성 §7). 대시보드 계정에는 열지 않는다 — 사람이 넣은 기대값 · 아이디가 든다
ALTER TABLE authoring_request ADD COLUMN held_input JSONB;

-- migrate:down

ALTER TABLE authoring_request DROP COLUMN IF EXISTS held_input;
