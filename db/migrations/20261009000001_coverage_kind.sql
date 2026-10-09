-- 작성 커버리지의 케이스로 덮은 요구를 기능 · UI 갈래로 나눠 남기는 칸과 대시보드 칸 권한
-- (docs/spec/도메인/작성.md §3.6 「★ 원장」 「셈을 남긴다」 · 공통/4-데이터모델 「작성 커버리지 칸」 · 「대시보드 칸 권한」)

-- migrate:up

-- 비어 있으면 갈래를 못 셌다(이 칸 전 실행 · 셈 없음). 0 으로 채우면 「그 갈래로 덮은 요구 0개」로 읽힌다
ALTER TABLE authoring_request ADD COLUMN coverage_cased_fn INTEGER;
ALTER TABLE authoring_request ADD COLUMN coverage_cased_ui INTEGER;

-- 한 요구를 두 갈래가 같이 덮으면 둘 다에 들어 합이 cased 를 넘을 수 있다. 덮인 요구는 어느 한 갈래에는 들므로 합이 cased 보다 작을 수는 없다.
-- cased 가 비었을 때 BETWEEN 이 NULL 이 되어 통과하지 않게 NOT NULL 을 같이 묶는다
ALTER TABLE authoring_request ADD CONSTRAINT authoring_request_coverage_kind_check CHECK (
  (coverage_cased_fn IS NULL AND coverage_cased_ui IS NULL)
  OR (
    coverage_cased IS NOT NULL AND coverage_cased_fn IS NOT NULL AND coverage_cased_ui IS NOT NULL
    AND coverage_cased_fn BETWEEN 0 AND coverage_cased
    AND coverage_cased_ui BETWEEN 0 AND coverage_cased
    AND coverage_cased_fn + coverage_cased_ui >= coverage_cased
  )
);

GRANT SELECT (coverage_cased_fn, coverage_cased_ui) ON authoring_request TO grafana_ro;

-- migrate:down

REVOKE SELECT (coverage_cased_fn, coverage_cased_ui) ON authoring_request FROM grafana_ro;
ALTER TABLE authoring_request DROP CONSTRAINT IF EXISTS authoring_request_coverage_kind_check;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_cased_ui;
ALTER TABLE authoring_request DROP COLUMN IF EXISTS coverage_cased_fn;
