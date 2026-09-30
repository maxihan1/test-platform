-- 작성 실행이 기획서 요구를 얼마나 덮었는지 남기는 칸과 대시보드 칸 권한
-- (docs/spec/도메인/작성.md §3.6 「★ 원장」 · 공통/4-데이터모델 「작성 커버리지 칸」 · 「대시보드 칸 권한」)

-- migrate:up

-- 비어 있으면 셈이 없는 실행이다(원장 없음 · 대조 전에 끝남 · 이 칸 전 요청). 0 으로 채우면 「요구 0개」로 읽힌다
ALTER TABLE authoring_request ADD COLUMN coverage_total INTEGER;
-- 케이스 파일로 덮인 요구 — 보류 케이스로 덮인 것도 든다
ALTER TABLE authoring_request ADD COLUMN coverage_cased INTEGER;
-- 그중 보류 케이스로만 덮인 요구. 보류를 못 셌으면 비운다 — 0 이면 「보류 없음」으로 읽힌다
ALTER TABLE authoring_request ADD COLUMN coverage_held INTEGER;
-- 제외 표로 뺀 요구(종류를 합친 수). 종류별 수는 result.coverage 에 있다
ALTER TABLE authoring_request ADD COLUMN coverage_excluded INTEGER;
-- 어디에도 없는 요구. 올리기를 막지 않으므로 0 이 아닐 수 있다 (2026-09-30 게이트 1)
ALTER TABLE authoring_request ADD COLUMN coverage_missing INTEGER;

-- 짝이 깨지면 대시보드의 케이스 % 가 조용히 틀린다. held 는 cased 가 비었을 때 비교가 NULL 이 되어 통과하므로 따로 묶는다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_coverage_check CHECK (
  (
    (coverage_total IS NULL AND coverage_cased IS NULL AND coverage_excluded IS NULL AND coverage_missing IS NULL)
    OR (
      coverage_total IS NOT NULL AND coverage_cased IS NOT NULL AND coverage_excluded IS NOT NULL AND coverage_missing IS NOT NULL
      AND coverage_total >= 0 AND coverage_cased >= 0 AND coverage_excluded >= 0 AND coverage_missing >= 0
      AND coverage_total = coverage_cased + coverage_excluded + coverage_missing
    )
  )
  AND (coverage_held IS NULL OR (coverage_cased IS NOT NULL AND coverage_held BETWEEN 0 AND coverage_cased))
);

GRANT SELECT (coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing)
  ON authoring_request TO grafana_ro;

-- migrate:down

REVOKE SELECT (coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing)
  ON authoring_request FROM grafana_ro;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_coverage_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_missing;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_excluded;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_held;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_cased;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_total;
