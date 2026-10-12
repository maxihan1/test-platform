-- 지도 ② 에 화면 파일 이름 — 테스트 목록이 주소 · 영문 파일 이름 대신 「게시판목록 화면」을 보인다 (진행판 PRD-F9-18)
-- 칸은 「화면 기록 열쇠에 대상 서버 · 역할 · 지도 ② 화면 이름」 절을 따른다 (docs/spec/공통/4-데이터모델.md)

-- migrate:up

-- 화면 파일 클래스 이름(`게시판목록화면` · `머리글`). 못 읽으면 NULL. 사본이라 다음 스캔이 채운다(지도 ② 는 스캔마다 다시 채운다)
ALTER TABLE case_screen ADD COLUMN name TEXT;

-- migrate:down

ALTER TABLE case_screen DROP COLUMN IF EXISTS name;
