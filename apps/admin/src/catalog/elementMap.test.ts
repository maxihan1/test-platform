// 케이스 선언의 게임 요소로 game_element_case 를 다시 채우는지 본다 (도메인/게임 §3.10 「게임에만 있는 지도 넷」)

import type { CaseSpec } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 게임밖요소, 게임플랫폼어긋남, 요소지도채우기 } from './elementMap.js';
import { save } from './saveCases.js';

const 케이스 = (tcId: string, elements?: string[]): CaseSpec => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['android'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  filePath: `xgc/${tcId}.spec.ts`,
  ...(elements === undefined ? {} : { elements }),
});

describe('게임밖요소', () => {
  it('elements 를 적은 케이스만 알린다', () => {
    expect(게임밖요소([케이스('XGC-FN-001', ['item:sword_long']), 케이스('XGC-FN-002')])).toEqual([
      'xgc/XGC-FN-001.spec.ts의 XGC-FN-001은 게임 애플리케이션 케이스가 아닌데 elements 를 적어 게임 지도에 넣지 않았다',
    ]);
  });

  it('windows 를 적은 케이스도 알린다 — 윈도우 PC 는 게임만 돈다', () => {
    expect(게임밖요소([{ ...케이스('XGC-FN-004'), platforms: ['android', 'windows'] }])).toEqual([
      'xgc/XGC-FN-004.spec.ts의 XGC-FN-004은 게임 애플리케이션 케이스가 아닌데 windows 를 적었다 — 윈도우 PC 에서는 게임만 돈다',
    ]);
  });

  it('패드 값만 적어도 알린다', () => {
    expect(게임밖요소([{ ...케이스('XGC-FN-005'), platforms: ['windows-ps5', 'windows-xbox'] }])).toEqual([
      'xgc/XGC-FN-005.spec.ts의 XGC-FN-005은 게임 애플리케이션 케이스가 아닌데 windows-ps5 · windows-xbox 를 적었다 — 윈도우 PC 에서는 게임만 돈다',
    ]);
  });
});

describe('게임플랫폼어긋남', () => {
  const 적기 = (tcId: string, ...platforms: CaseSpec['platforms']): CaseSpec => ({ ...케이스(tcId), platforms });

  it('모바일 게임이 윈도우 값을 적으면 알린다 — 패드 값도 같다', () => {
    expect(게임플랫폼어긋남([적기('XGC-FN-001', 'android'), 적기('XGC-FN-002', 'windows'), 적기('XGC-FN-003', 'windows-ps5')], 'android', [])).toEqual([
      'xgc/XGC-FN-002.spec.ts의 XGC-FN-002은 모바일 게임 케이스인데 windows 를 적었다 — 모바일 게임은 android 만 돈다',
      'xgc/XGC-FN-003.spec.ts의 XGC-FN-003은 모바일 게임 케이스인데 windows-ps5 를 적었다 — 모바일 게임은 android 만 돈다',
    ]);
  });

  it('PC 게임이 android 를 적으면 알린다', () => {
    expect(게임플랫폼어긋남([적기('XGC-FN-001', 'windows'), 적기('XGC-FN-002', 'android')], 'windows', [])).toEqual([
      'xgc/XGC-FN-002.spec.ts의 XGC-FN-002은 PC 게임 케이스인데 android 를 적었다 — PC 게임은 윈도우 값만 돈다',
    ]);
  });

  it('PC 게임이 지원 패드에 없는 패드 값을 적으면 알린다 — windows 는 패드를 안 본다', () => {
    const 케이스들 = [적기('XGC-FN-001', 'windows'), 적기('XGC-FN-002', 'windows-ps5', 'windows-xbox'), 적기('XGC-FN-003', 'windows-switch')];
    expect(게임플랫폼어긋남(케이스들, 'windows', ['ps5', 'ps4'])).toEqual([
      'xgc/XGC-FN-002.spec.ts의 XGC-FN-002은 지원 패드에 없는 windows-xbox 를 적었다 — 지원 패드는 ps5 · ps4 이다',
      'xgc/XGC-FN-003.spec.ts의 XGC-FN-003은 지원 패드에 없는 windows-switch 를 적었다 — 지원 패드는 ps5 · ps4 이다',
    ]);
    expect(게임플랫폼어긋남([적기('XGC-FN-004', 'windows-ps4')], 'windows', [])).toEqual([
      'xgc/XGC-FN-004.spec.ts의 XGC-FN-004은 지원 패드에 없는 windows-ps4 를 적었다 — 지원 패드를 하나도 체크하지 않았다',
    ]);
  });

  it('맞게 적은 케이스는 조용하다', () => {
    expect(게임플랫폼어긋남([적기('XGC-FN-001', 'windows'), 적기('XGC-FN-002', 'windows-ps5', 'windows-xbox')], 'windows', ['ps5', 'xbox'])).toEqual([]);
    expect(게임플랫폼어긋남([적기('XGC-FN-003', 'android')], 'android', [])).toEqual([]);
  });
});

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('요소지도채우기', () => {
  let 서비스 = 0;
  let 남 = 0;
  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T>(sql, 값);
  };
  const 줄들 = async (id: number) =>
    (await q<{ key: string; tc_id: string }>('SELECT key, tc_id FROM game_element_case WHERE service_id = $1 ORDER BY key, tc_id', [id])).rows;

  const 치우기 = async () => {
    await q("DELETE FROM test_case WHERE tc_id = ANY($1)", [['XGC-FN-003']]);
    await q("DELETE FROM game_element_case WHERE service_id IN (SELECT id FROM service WHERE prefix IN ('XGC', 'XGCB'))");
    await q("DELETE FROM service WHERE prefix IN ('XGC', 'XGCB')");
  };

  beforeAll(async () => {
    await 치우기();
    const 만들기 = async (prefix: string) =>
      Number(
        (await q<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, $1 || ' 요소 지도 검사용', '#3A5FCD', '', lower($1), 'GAME', 'android') RETURNING id`,
          [prefix],
        )).rows[0]!.id,
      );
    서비스 = await 만들기('XGC');
    남 = await 만들기('XGCB');
    await q(`INSERT INTO game_element_case (service_id, key, tc_id) VALUES ($1, 'zone:Town', 'XGCB-FN-001')`, [남]);
  });

  afterAll(치우기);

  it('스캔 저장이 elements 를 칸에 싣고, 지우면 빈 목록으로 덮는다', async () => {
    const 읽기 = async () => (await q<{ elements: string[] }>("SELECT elements FROM test_case WHERE tc_id = 'XGC-FN-003'")).rows[0]?.elements;
    await save([케이스('XGC-FN-003', ['item:sword_long', 'zone:Town'])], false, 'XGC');
    expect(await 읽기()).toEqual(['item:sword_long', 'zone:Town']);
    await save([케이스('XGC-FN-003')], false, 'XGC');
    expect(await 읽기()).toEqual([]);
  });

  it('그 애플리케이션 몫을 지우고 케이스 선언에서 다시 채운다 — 남의 애플리케이션 줄은 그대로다', async () => {
    await q(`INSERT INTO game_element_case (service_id, key, tc_id) VALUES ($1, 'item:old', 'XGC-FN-009')`, [서비스]);
    const 수 = await 요소지도채우기(서비스, [케이스('XGC-FN-001', ['item:sword_long', 'zone:Town']), 케이스('XGC-FN-002')], true);
    expect(수).toBe(2);
    expect(await 줄들(서비스)).toEqual([
      { key: 'item:sword_long', tc_id: 'XGC-FN-001' },
      { key: 'zone:Town', tc_id: 'XGC-FN-001' },
    ]);
    expect(await 줄들(남)).toEqual([{ key: 'zone:Town', tc_id: 'XGCB-FN-001' }]);
  });

  it('케이스 파일을 다 못 읽었으면 읽은 케이스 몫만 바꾼다', async () => {
    await 요소지도채우기(서비스, [케이스('XGC-FN-002', ['flow:골드-강화'])], false);
    expect(await 줄들(서비스)).toEqual([
      { key: 'flow:골드-강화', tc_id: 'XGC-FN-002' },
      { key: 'item:sword_long', tc_id: 'XGC-FN-001' },
      { key: 'zone:Town', tc_id: 'XGC-FN-001' },
    ]);
  });
});
