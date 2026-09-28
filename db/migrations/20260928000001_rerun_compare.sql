-- 화면대조 요청도 「같은 자료로 다시 작성」 — 재실행 행이 원본의 대조·대상 서버·시작 주소를 물려받는다
-- 본문은 「대조 재실행」 계약 블록을 그대로 옮긴 것이다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 재실행은 원본과 같은 자료를 같은 화면에 대고 다시 돈다. 머지는 PR 만 다루므로 여전히 대조가 붙지 않는다
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind IN ('AUTHOR', 'RERUN')
              ELSE env IS NULL AND start_url IS NULL END);

-- migrate:down

-- 옛 제약은 대조를 끈 행에 서버·주소가 남는 것도 거절한다. 셋을 함께 비워야 다시 걸린다
UPDATE authoring_request SET compare = false, env = NULL, start_url = NULL
 WHERE kind = 'RERUN' AND compare;
ALTER TABLE authoring_request DROP CONSTRAINT authoring_request_compare_check;
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_compare_check
  CHECK (CASE WHEN compare THEN env IS NOT NULL AND kind = 'AUTHOR'
              ELSE env IS NULL AND start_url IS NULL END);
