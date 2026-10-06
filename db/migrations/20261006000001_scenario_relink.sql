-- 시나리오 부품 행에 미확정 사유 · 꽂은 값 · 미룬 뒷정리 칸을 붙인다 — 도메인/시나리오 §3.7 결정 12 이어 주기 (2026-10-06 사용자)
-- unconfirmed 는 실행을 만들 때 박제한다. run_item.unconfirmed 와 같은 까닭이다 — 케이스가 나중에 확정돼도 그날의 증적은 미확정 표시를 그대로 가져야 한다
-- 기존 행은 bound {} · cleanup [] 기본값으로 차고, unconfirmed 는 소급하지 않는다(그때 사유를 알 길이 없다)

-- migrate:up

ALTER TABLE scenario_run_part
  ADD COLUMN unconfirmed TEXT,
  ADD COLUMN bound JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN cleanup JSONB NOT NULL DEFAULT '[]';

-- migrate:down

ALTER TABLE scenario_run_part
  DROP COLUMN unconfirmed,
  DROP COLUMN bound,
  DROP COLUMN cleanup;
