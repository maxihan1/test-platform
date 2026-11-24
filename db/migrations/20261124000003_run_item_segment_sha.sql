-- 프로시저 안 케이스의 지문 둘 — 파일 지문(case_sha256)은 프로시저 하나에 케이스가 여럿이라 한 케이스만 고쳐도 모두 「수정」이 된다.
-- QA 리포트 「변경 사항 — 테스트」가 자기 구간이 바뀐 것(수정)과 앞 흐름만 바뀐 것(선행 케이스 변경)을 가른다 (도메인/리포팅 §3.17 「프로시저 안 케이스의 지문 둘」 · TP-F3-18)
-- case_sha256 의 뜻은 안 바꾼다. 옛 꼴 케이스는 둘 다 NULL 이고 둘은 같이 차거나 같이 빈다

-- migrate:up

ALTER TABLE run_item ADD COLUMN seg_sha256 TEXT, ADD COLUMN flow_sha256 TEXT;

-- migrate:down

ALTER TABLE run_item DROP COLUMN seg_sha256, DROP COLUMN flow_sha256;
