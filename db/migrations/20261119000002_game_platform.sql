-- 게임 하나에 플랫폼 하나 — 게임 애플리케이션의 플랫폼 · 지원 패드, 실행의 PC 빌드 칸 지우기 (docs/spec/공통/4-데이터모델.md 「게임 애플리케이션 플랫폼」 · GAME-F4-05)

-- migrate:up

-- 등록 카드 「모바일 게임」 'android' · 「PC 게임」 'windows'. 만든 뒤에는 못 바꾼다(설정 PATCH 400 PLATFORM_IMMUTABLE). GAME 이 아니면 NULL
ALTER TABLE service ADD COLUMN game_platform TEXT CHECK (game_platform IN ('android', 'windows'));
-- 2026-11-19 에 등록된 게임은 전부 모바일이다 — 운영 DB 에 게임의 windows 빌드가 0 인 것을 보고 채운다
UPDATE service SET game_platform = 'android' WHERE kind = 'GAME';
ALTER TABLE service ADD CONSTRAINT service_game_platform_kind CHECK ((kind = 'GAME') = (game_platform IS NOT NULL));
-- 새 작성에서 사람이 체크한 패드. PC 게임만 채운다. 값 넷 · 겹침은 서버가 본다(400 BAD_PAD)
ALTER TABLE service ADD COLUMN game_pads JSONB NOT NULL DEFAULT '[]';
ALTER TABLE service ADD CONSTRAINT service_game_pads_pc CHECK (COALESCE(game_platform, '') = 'windows' OR game_pads = '[]'::jsonb);
-- 실행 빌드 칸은 하나 — PC 게임 실행도 build_id · build_no 에 고정한다. 운영 DB 에 값이 든 줄이 0 인 것을 보고 지운다
ALTER TABLE test_run DROP COLUMN pc_build_id, DROP COLUMN pc_build_no;

-- migrate:down

-- 되돌리지 않는다 — 지운 PC 빌드 칸은 값이 없던 칸이고, 게임 플랫폼을 지우면 PC 게임이 모바일 게임으로 읽힌다 (공통/4 「게임 애플리케이션 플랫폼」)
SELECT 1;
