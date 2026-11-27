-- 기기 성능 1초 숫자에 프레임 시간 분포 · 열 상태 · PC GPU 사용률 · VRAM 칸을 더한다 (docs/spec/공통/4-데이터모델.md perf_device_metric · 도메인/성능 §3.9 「기기 성능: PC 게임과 측정 정의」 · PERF-F2-03)

-- migrate:up

ALTER TABLE perf_device_metric
  ADD COLUMN frame_hist     JSONB,
  ADD COLUMN thermal_status SMALLINT CHECK (thermal_status BETWEEN 0 AND 6),
  ADD COLUMN gpu            NUMERIC(5,1),
  ADD COLUMN vram_mb        INTEGER;

-- migrate:down

ALTER TABLE perf_device_metric
  DROP COLUMN frame_hist,
  DROP COLUMN thermal_status,
  DROP COLUMN gpu,
  DROP COLUMN vram_mb;
