// 서비스 읽기가 게임 플랫폼 · 지원 패드 칸을 싣는지 본다 (GAME-F4-05 · 스캐너 문제 줄이 이 값을 쓴다)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { activeServices } from './store.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('activeServices 의 게임 플랫폼', () => {
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 치우기 = () => q("DELETE FROM service WHERE prefix IN ('XGPA', 'XGPB', 'XGPC')");

  beforeAll(async () => {
    await 치우기();
    const 넣기 = (prefix: string, kind: string, platform: string | null, pads: string[]) =>
      q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform, game_pads)
         VALUES ($1, $1 || ' 게임 플랫폼 검사용', '#3A5FCD', '', lower($1), $2, $3, $4::jsonb)`,
        [prefix, kind, platform, JSON.stringify(pads)],
      );
    await 넣기('XGPA', 'GAME', 'android', []);
    await 넣기('XGPB', 'GAME', 'windows', ['ps5', 'xbox']);
    await 넣기('XGPC', 'SCREEN', null, []);
  });

  afterAll(치우기);

  it('플랫폼과 지원 패드를 그대로 읽고, 게임이 아니면 null · 빈 배열이다', async () => {
    const 서비스들 = (await activeServices()).filter((s) => s.prefix.startsWith('XGP'));
    expect(서비스들.map((s) => [s.prefix, s.gamePlatform, s.gamePads])).toEqual([
      ['XGPA', 'android', []],
      ['XGPB', 'windows', ['ps5', 'xbox']],
      ['XGPC', null, []],
    ]);
  });
});
