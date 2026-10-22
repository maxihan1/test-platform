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
    await pool.query("DELETE FROM case_input WHERE tc_id IN ('ZZA-001', 'ZZA-002')");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZA%'");
    await pool.query("DELETE FROM app_user WHERE username = 'zzasaver'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM case_input WHERE tc_id IN ('ZZA-001', 'ZZA-002')");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'ZZA%'");
    await pool.query("DELETE FROM app_user WHERE username = 'zzasaver'");
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

  it('케이스가 0건이어도 내리라고 하면 그 접두사 케이스를 전부 비활성으로 내린다', async () => {
    expect((await save([], false, 'ZZA')).deactivated).toBe(0);

    const result = await save([], true, 'ZZA');
    expect(result.deactivated).toBe(2);

    const gone = await pool.query<{ is_active: boolean }>(
      "SELECT is_active FROM test_case WHERE tc_id IN ('ZZA-001', 'ZZA-002')",
    );
    expect(gone.rows.map((r) => r.is_active)).toEqual([false, false]);
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

  describe('목록·단건의 미확정 칸', () => {
    const 조건 = { service: 'ZZA', q: '', activeOnly: true, page: 1, pageSize: 50 };

    const 근거 = [{ from: '기획서.docx', quote: '장바구니는 20개까지' }];
    let 서비스 = 0;

    beforeAll(async () => {
      await save([spec('ZZA-001'), spec('ZZA-101'), spec('ZZA-102')], false, 'ZZA');
      await save([spec('ZZA-103')], false, 'ZZA');
      await save([spec('ZZA-001'), spec('ZZA-101'), spec('ZZA-103')], true, 'ZZA');
      const s = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
         VALUES ('ZZA', 'ZZA 목록 미확정 검사용', '#888888', '', 'zza') RETURNING id`,
      );
      서비스 = Number(s.rows[0]!.id);
      await pool.query(
        `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
         VALUES ($1, 1, $2, 2, 'PERSON', 'zza', '검사')`,
        [서비스, JSON.stringify([
          { reqId: 'ZZA-REQ-001', feature: '장바구니', text: '확인 필요', basis: 근거, status: 'NEEDS_CHECK' },
          { reqId: 'ZZA-REQ-002', feature: '장바구니', text: '확정', basis: 근거, status: 'CONFIRMED' },
        ])],
      );
      for (const [req, tc] of [['ZZA-REQ-001', 'ZZA-101'], ['ZZA-REQ-001', 'ZZA-102'], ['ZZA-REQ-001', 'ZZA-103'], ['ZZA-REQ-002', 'ZZA-001']]) {
        await pool.query(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, '정상')`, [서비스, req, tc]);
      }
    });

    afterAll(async () => {
      await pool.query('DELETE FROM req_case WHERE service_id = $1', [서비스]);
      await pool.query('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
      await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    });

    it('items 에 사유가 실리고 없으면 null 이다 — 단 시각은 싣지 않는다', async () => {
      const list = await listCases(조건);
      const 확정 = list.items.find((i) => i.tcId === 'ZZA-001');
      const 미확정 = list.items.find((i) => i.tcId === 'ZZA-103');
      expect(확정?.unconfirmed).toBeNull();
      expect(미확정?.unconfirmed).toBe('확인 필요 — ZZA-REQ-001');
      expect(미확정).not.toHaveProperty('unconfirmedSince');
    });

    it('서비스 요약은 활성 미확정 건수만 준다', async () => {
      const list = await listCases(조건);
      expect(list.unconfirmed).toEqual({ count: 2 });
    });

    it('서비스 요약은 검색 조건을 따르지 않는다', async () => {
      const list = await listCases({ ...조건, q: '아무것도 안 맞는 검색어', platform: 'mobile' });
      expect(list.items).toHaveLength(0);
      expect(list.unconfirmed.count).toBe(2);
    });

    it('저장한 사람은 아이디가 아니라 계정 이름으로 싣는다 — 계정이 없으면 아이디 그대로', async () => {
      await save([spec('ZZA-001'), spec('ZZA-002')], false, 'ZZA');
      await pool.query(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
              VALUES ('zzasaver', '맥시', 'x', 'member', 'read', true, false)`,
      );
      await pool.query(
        `INSERT INTO case_input (tc_id, params, expected, saved_by, saved_at)
         VALUES ('ZZA-001', '{}', '{}', 'zzasaver', now()), ('ZZA-002', '{}', '{}', 'zzagone', now())`,
      );
      expect((await findCase('ZZA-001'))?.savedInput?.savedBy).toBe('맥시');
      expect((await findCase('ZZA-002'))?.savedInput?.savedBy).toBe('zzagone');
      await pool.query("DELETE FROM case_input WHERE tc_id IN ('ZZA-001', 'ZZA-002')");
      await pool.query("DELETE FROM app_user WHERE username = 'zzasaver'");
    });

    it('미확정이 없으면 요약은 0 이다', async () => {
      const list = await listCases({ ...조건, service: 'ZZA0' });
      expect(list.unconfirmed).toEqual({ count: 0 });
    });

    it('저장값은 목록·단건 모두 savedInput 으로 싣고 비밀값은 이름만, 명세에 없는 칸은 빼고 준다 — 없으면 null', async () => {
      await save([spec('ZZA-001', {
        paramSchema: { type: 'object', properties: { loginId: { type: 'string' }, pw: { type: 'string', secret: true } } },
        expectedSchema: { type: 'object', properties: { flag: { type: 'boolean' } } },
      })], false, 'ZZA');
      await pool.query(
        `INSERT INTO case_input (tc_id, params, expected, saved_by, saved_at)
         VALUES ('ZZA-001', '{"loginId":"u","pw":"pa55","oldToken":"t0k"}', '{"flag":false}', 'zza', '2026-09-29T01:00:00Z')`,
      );
      const 기대 = {
        params: { loginId: 'u' },
        expected: { flag: false },
        savedSecrets: { params: ['pw'], expected: [] },
        savedBy: 'zza',
        savedAt: '2026-09-29T01:00:00.000Z',
      };
      const list = await listCases(조건);
      expect(list.items.find((i) => i.tcId === 'ZZA-001')?.savedInput).toEqual(기대);
      expect(list.items.find((i) => i.tcId === 'ZZA-101')?.savedInput).toBeNull();
      expect((await findCase('ZZA-001'))?.savedInput).toEqual(기대);
      expect((await findCase('ZZA-101'))?.savedInput).toBeNull();
      await pool.query("DELETE FROM case_input WHERE tc_id = 'ZZA-001'");
    });

    it('단건도 사유를 싣는다', async () => {
      const found = await findCase('ZZA-101');
      expect(found?.unconfirmed).toBe('확인 필요 — ZZA-REQ-001');
    });
  });
});
