-- 지도 ② 에 화면 파일 안 이동이 여는 다른 주소 틀 — 「게시글 수정」(/board/:n/edit)을 미검증 화면으로 세지 않게 (진행판 WEB-F6-03)
-- 칸은 docs/spec/공통/4-데이터모델.md 「지도 ② 여는 주소」 절을 따른다

-- migrate:up

-- 화면 파일의 `page.goto` 가 여는 주소 틀(`${…}` 자리는 :n). screen_url 과 같은 것은 안 넣는다. 사본이라 다음 스캔이 채운다
ALTER TABLE case_screen ADD COLUMN open_urls TEXT[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE case_screen DROP COLUMN IF EXISTS open_urls;
