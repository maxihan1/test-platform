-- 기기 성능 1초 숫자에 그 간격의 프리징(0.7초 넘게 걸린 프레임) 수를 남긴다 (공통/4-데이터모델 perf_device_metric · WEB-F7-26)
-- 칸은 perf_device_metric 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 못 읽었거나(게임 · SurfaceView) 칸이 생기기 전 줄은 NULL 이다
ALTER TABLE perf_device_metric ADD COLUMN freeze_count INTEGER CHECK (freeze_count >= 0);

-- migrate:down

ALTER TABLE perf_device_metric DROP COLUMN IF EXISTS freeze_count;
