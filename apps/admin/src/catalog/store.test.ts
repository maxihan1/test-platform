// 스캔 결과가 test_case에 덮어써지는지, 사라진 케이스가 지워지지 않고 비활성으로만 남는지 검사한다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { findCase, listCases, save } from './store.js';

const 연결 = process.env.DATABASE_URL;

function spec(tcId: string, over: Partial<CaseSpec> = {}): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: ['사전조건 하나'],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `demo/${tcId}.spec.ts`,
    ...over,
  };
}

describe.skipIf(연결 === undefined)('save', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZA%'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZA%'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('처음 본 케이스는 added로 센다', async () => {
    const result = await save([spec('ZZA-001'), spec('ZZA-002')], false, 'ZZA');
    expect(result).toMatchObject({ added: 2, updated: 0, deactivated: 0 });
  });

  it('이미 있는 케이스는 updated로 세고 내용을 덮어쓴다', async () => {
    const result = await save([spec('ZZA-001', { name: '이름이 바뀌었다' }), spec('ZZA-002')], false, 'ZZA');
    expect(result).toMatchObject({ added: 0, updated: 2 });

    const row = await pool.query<{ name: string }>('SELECT name FROM test_case WHERE tc_id = $1', ['ZZA-001']);
    expect(row.rows[0]?.name).toBe('이름이 바뀌었다');
  });

  it('스키마와 환경은 JSONB로 그대로 실린다', async () => {
    await save([spec('ZZA-001', {
      platforms: ['desktop', 'mobile'],
      paramSchema: { type: 'object', properties: { todo: { type: 'string', description: '할 일' } } },
    })], false, 'ZZA');

    const row = await pool.query<{ platforms: string[]; param_schema: Record<string, unknown> }>(
      'SELECT platforms, param_schema FROM test_case WHERE tc_id = $1',
      ['ZZA-001'],
    );
    expect(row.rows[0]?.platforms).toEqual(['desktop', 'mobile']);
    expect(row.rows[0]?.param_schema).toMatchObject({
      properties: { todo: { description: '할 일' } },
    });
  });

  it('코드에서 사라진 케이스는 지우지 않고 is_active만 내린다', async () => {
    await save([spec('ZZA-001'), spec('ZZA-002')], false, 'ZZA');
    await save([spec('ZZA-001')], true, 'ZZA');

    const gone = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-002'],
    );
    expect(gone.rowCount).toBe(1);
    expect(gone.rows[0]?.is_active).toBe(false);
  });

  it('다시 나타난 케이스는 is_active가 올라간다', async () => {
    await save([spec('ZZA-001'), spec('ZZA-002')], true, 'ZZA');

    const back = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-002'],
    );
    expect(back.rows[0]?.is_active).toBe(true);
  });

  it('스캔 결과가 비면 아무것도 비활성으로 내리지 않는다', async () => {
    const result = await save([], true, 'ZZA');
    expect(result.deactivated).toBe(0);

    const still = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-001'],
    );
    expect(still.rows[0]?.is_active).toBe(true);
  });

  it('다른 접두사의 케이스는 비활성으로 내리지 않는다', async () => {
    await save([spec('ZZA-001'), spec('ZZA-002')], false, 'ZZA');
    const before = await pool.query<{ n: string }>(
      "SELECT count(*) AS n FROM test_case WHERE is_active AND tc_id NOT LIKE 'ZZA-%'",
    );

    await save([spec('ZZA-001')], true, 'ZZA');

    const after = await pool.query<{ n: string }>(
      "SELECT count(*) AS n FROM test_case WHERE is_active AND tc_id NOT LIKE 'ZZA-%'",
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });

  describe('미확정 꼬리표', () => {
    async function 꼬리표(tcId: string): Promise<{ unconfirmed: string | null; since: Date | null }> {
      const row = await pool.query<{ unconfirmed: string | null; unconfirmed_since: Date | null }>(
        'SELECT unconfirmed, unconfirmed_since FROM test_case WHERE tc_id = $1',
        [tcId],
      );
      return { unconfirmed: row.rows[0]?.unconfirmed ?? null, since: row.rows[0]?.unconfirmed_since ?? null };
    }

    let 처음: Date | null = null;

    it('사유가 있는 명세를 저장하면 사유와 단 시각이 실린다', async () => {
      await save([spec('ZZA-101', { unconfirmed: '기획서와 다름' })], false, 'ZZA');
      const got = await 꼬리표('ZZA-101');
      expect(got.unconfirmed).toBe('기획서와 다름');
      expect(got.since).toBeInstanceOf(Date);
      처음 = got.since;
    });

    it('사유 글자만 바뀌면 사유는 새 글이고 단 시각은 그대로다', async () => {
      await save([spec('ZZA-101', { unconfirmed: '화면만 보고 만들었다' })], false, 'ZZA');
      const got = await 꼬리표('ZZA-101');
      expect(got.unconfirmed).toBe('화면만 보고 만들었다');
      expect(got.since?.getTime()).toBe(처음?.getTime());
    });

    it('사유가 빠지면 사유와 단 시각이 둘 다 비워진다', async () => {
      await save([spec('ZZA-101')], false, 'ZZA');
      expect(await 꼬리표('ZZA-101')).toEqual({ unconfirmed: null, since: null });
    });

    it('풀렸다가 다시 달리면 단 시각이 새로 찍힌다', async () => {
      await save([spec('ZZA-101', { unconfirmed: '다시 미확정' })], false, 'ZZA');
      const got = await 꼬리표('ZZA-101');
      expect(got.unconfirmed).toBe('다시 미확정');
      expect(got.since).toBeInstanceOf(Date);
      expect(got.since?.getTime()).toBeGreaterThan(처음?.getTime() ?? Infinity);
    });
  });

  describe('목록·단건의 미확정 칸', () => {
    const 조건 = { service: 'ZZA', q: '', activeOnly: true, page: 1, pageSize: 50 };

    beforeAll(async () => {
      await save([
        spec('ZZA-001'),
        spec('ZZA-101', { unconfirmed: '먼저 단 사유' }),
        spec('ZZA-102', { unconfirmed: '곧 비활성' }),
      ], false, 'ZZA');
      await save([spec('ZZA-103', { unconfirmed: '나중에 단 사유' })], false, 'ZZA');
      await save([spec('ZZA-001'), spec('ZZA-101', { unconfirmed: '먼저 단 사유' }), spec('ZZA-103', {
        unconfirmed: '나중에 단 사유',
      })], true, 'ZZA');
    });

    it('items 에 사유와 단 시각이 실리고 없으면 null 이다', async () => {
      const list = await listCases(조건);
      const 확정 = list.items.find((i) => i.tcId === 'ZZA-001');
      const 미확정 = list.items.find((i) => i.tcId === 'ZZA-103');
      expect(확정).toMatchObject({ unconfirmed: null, unconfirmedSince: null });
      expect(미확정?.unconfirmed).toBe('나중에 단 사유');
      expect(new Date(미확정?.unconfirmedSince ?? '').toISOString()).toBe(미확정?.unconfirmedSince);
    });

    it('서비스 요약은 활성 미확정만 세고 가장 오래 단 시각을 준다', async () => {
      const list = await listCases(조건);
      const 먼저 = list.items.find((i) => i.tcId === 'ZZA-101');
      expect(list.unconfirmed).toEqual({ count: 2, oldestSince: 먼저?.unconfirmedSince });
    });

    it('서비스 요약은 검색 조건을 따르지 않는다', async () => {
      const list = await listCases({ ...조건, q: '아무것도 안 맞는 검색어', platform: 'mobile' });
      expect(list.items).toHaveLength(0);
      expect(list.unconfirmed.count).toBe(2);
    });

    it('미확정이 없으면 요약은 0 과 null 이다', async () => {
      const list = await listCases({ ...조건, service: 'ZZA0' });
      expect(list.unconfirmed).toEqual({ count: 0, oldestSince: null });
    });

    it('단건도 사유와 단 시각을 싣는다', async () => {
      const found = await findCase('ZZA-101');
      expect(found?.unconfirmed).toBe('먼저 단 사유');
      expect(typeof found?.unconfirmedSince).toBe('string');
    });
  });
});
