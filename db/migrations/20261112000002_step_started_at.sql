-- 단계 시작 시각을 남긴다 — 안정화 지표가 게임 오류 시각으로 단계를 맞춘다 (docs/spec/공통/4-데이터모델.md 「안정화 표」 · STAB-F1-05)

-- migrate:up

-- StepResult.startedAt 그대로. 이 칸이 생기기 전 기록과 시각을 안 싣는 옛 결과는 NULL — 그 단계는 오류 단계 맞추기에서 빠진다
ALTER TABLE run_item_step ADD COLUMN started_at TIMESTAMPTZ;

-- migrate:down

ALTER TABLE run_item_step DROP COLUMN IF EXISTS started_at;
