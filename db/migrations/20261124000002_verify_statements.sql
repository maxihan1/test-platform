-- 케이스의 확인 문장 칸 — 항목 상세 · 증적의 「기대 결과」는 실행 전부터 있어야 하는 성공 조건이라 케이스 코드의 verify 첫 인자를 싣는다 (2026-11-24 사용자 · TP-F3-35)
-- test_case 는 스캐너가 코드에서 읽어 채운다. NULL 은 못 읽었거나 이 칸 전의 줄이고, '{}' 는 읽었는데 문장이 없다는 뜻이다
-- run_item 은 실행을 만들 때 그 케이스의 값을 박제한다 — 카탈로그는 스캔마다 덮어쓰는 캐시라 나중에 읽으면 그날의 기대가 달라진다

-- migrate:up

ALTER TABLE test_case ADD COLUMN verify_statements TEXT[];
ALTER TABLE run_item ADD COLUMN verify_statements TEXT[];

-- migrate:down

ALTER TABLE run_item DROP COLUMN verify_statements;
ALTER TABLE test_case DROP COLUMN verify_statements;
