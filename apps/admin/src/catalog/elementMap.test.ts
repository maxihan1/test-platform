// 케이스 선언의 게임 요소로 game_element_case 를 다시 채우는지 본다 (도메인/게임 §3.10 「게임에만 있는 지도 넷」)

import type { CaseSpec } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 게임밖요소, 요소지도채우기 } from './elementMap.js';
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
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, $1 || ' 요소 지도 검사용', '#3A5FCD', '', lower($1), 'GAME') RETURNING id`,
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
