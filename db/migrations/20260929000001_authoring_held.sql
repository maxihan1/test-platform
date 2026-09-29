-- 작성 보류 입력 — 사람이 보류 케이스에 넣은 값 · 제거 표시
-- 본문은 「작성 보류 입력 칸」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 모양은 서버가 가둔다(도메인/작성 §7). 대시보드 계정에는 열지 않는다 — 사람이 넣은 기대값 · 아이디가 든다
ALTER TABLE authoring_request ADD COLUMN held_input JSONB;

-- 정방향 반영은 사람이 고른 대상 서버를 머지 행에 둔다 (도메인/작성 §3.6 「★ 보류 케이스」). 시작 주소는 머지에 뜻이 없어 여전히 막는다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind IN ('AUTHOR', 'RERUN')
              WHEN kind = 'MERGE' THEN start_url IS NULL
              ELSE env IS NULL AND start_url IS NULL END);

-- migrate:down

UPDATE authoring_request SET env = NULL WHERE kind = 'MERGE';
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind IN ('AUTHOR', 'RERUN')
              ELSE env IS NULL AND start_url IS NULL END);

ALTER TABLE authoring_request DROP COLUMN IF EXISTS held_input;
