// 스캔 결과가 test_case에 덮어써지는지, 사라진 케이스가 지워지지 않고 비활성으로만 남는지 검사한다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { save } from './store.js';

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
  let 원래활성: string[] = [];

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    const before = await pool.query<{ tc_id: string }>('SELECT tc_id FROM test_case WHERE is_active');
    원래활성 = before.rows.map((r) => r.tc_id);
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZ%'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZ%'");
    // 이 테스트의 비활성 처리는 다른 케이스까지 건드린다. 원래 상태로 돌려놓는다
    await pool.query('UPDATE test_case SET is_active = true WHERE tc_id = ANY($1::text[])', [원래활성]);
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('처음 본 케이스는 added로 센다', async () => {
    const result = await save([spec('ZZA-001'), spec('ZZA-002')], false);
    expect(result).toMatchObject({ added: 2, updated: 0, deactivated: 0 });
  });

  it('이미 있는 케이스는 updated로 세고 내용을 덮어쓴다', async () => {
    const result = await save([spec('ZZA-001', { name: '이름이 바뀌었다' }), spec('ZZA-002')], false);
    expect(result).toMatchObject({ added: 0, updated: 2 });

    const row = await pool.query<{ name: string }>('SELECT name FROM test_case WHERE tc_id = $1', ['ZZA-001']);
    expect(row.rows[0]?.name).toBe('이름이 바뀌었다');
  });

  it('스키마와 환경은 JSONB로 그대로 실린다', async () => {
    await save([spec('ZZA-001', {
      platforms: ['desktop', 'mobile'],
      paramSchema: { type: 'object', properties: { todo: { type: 'string', description: '할 일' } } },
    })], false);

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
    await save([spec('ZZA-001'), spec('ZZA-002')], false);
    await save([spec('ZZA-001')], true);

    const gone = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-002'],
    );
    expect(gone.rowCount).toBe(1);
    expect(gone.rows[0]?.is_active).toBe(false);
  });

  it('다시 나타난 케이스는 is_active가 올라간다', async () => {
    await save([spec('ZZA-001'), spec('ZZA-002')], true);

    const back = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-002'],
    );
    expect(back.rows[0]?.is_active).toBe(true);
  });

  it('스캔 결과가 비면 아무것도 비활성으로 내리지 않는다', async () => {
    const result = await save([], true);
    expect(result.deactivated).toBe(0);

    const still = await pool.query<{ is_active: boolean }>(
      'SELECT is_active FROM test_case WHERE tc_id = $1',
      ['ZZA-001'],
    );
    expect(still.rows[0]?.is_active).toBe(true);
  });
});
