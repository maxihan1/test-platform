// 실행 때 비어 있는 계정 칸을 그 실행 대상 서버 줄의 계정으로 채운다 — 요청 값 → 저장값 → 계정 차례 · 역할 꼬리표 · 다른 env 안 씀
// (SPEC 도메인/실행 §3.2 · 도메인/작성 §3.6 「★ 역할별 계정」). CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import type { ScenarioPart } from '@platform/kit';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 부품채우기 } from '../scenario/runStore.js';
import { 대상서버계정 } from './savedInput.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAF';
const 케이스 = 'XAF-001';

const 입력스키마 = {
  type: 'object',
  properties: {
    userId: { type: 'string', secret: true },
    password: { type: 'string', secret: true },
    adminId: { type: 'string', secret: true, account: '관리자' },
    adminPw: { type: 'string', secret: true, account: '관리자' },
    sellerPw: { type: 'string', secret: true, account: '판매자' },
    apiToken: { type: 'string', secret: true },
    note: { type: 'string' },
  },
};
const 기대스키마 = { type: 'object', properties: { password: { type: 'string', secret: true } } };

describe.skipIf(연결 === undefined)('실행 때 계정 채우기', () => {
  let 서비스 = 0;
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기(): Promise<void> {
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM case_input WHERE tc_id = $1', [케이스]);
  }

  beforeAll(async () => {
    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XAF 계정 채우기 검사용', '#3A5FCD', '', 'xaf')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기();
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, role_accounts) VALUES
         ($1, 'qa', 'https://qa.xaf.test', 'member', 'pw-member', false, $2),
         ($1, 'stg', 'https://stg.xaf.test', 'stg-member', 'pw-stg', false, $3),
         ($1, 'live', 'https://xaf.test', 'live-member', 'pw-live', true, '[]')`,
      [
        서비스,
        JSON.stringify([{ role: '관리자', loginId: 'admin', loginPassword: 'pw-admin' }]),
        JSON.stringify([{ role: '판매자', loginId: 'seller', loginPassword: 'pw-seller' }]),
      ],
    );
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, 'XAF 로그인', '["desktop"]', '[]', 'xaf/a.spec.ts', $2, $3)
       ON CONFLICT (tc_id) DO UPDATE SET param_schema = EXCLUDED.param_schema, expected_schema = EXCLUDED.expected_schema,
                                         platforms = EXCLUDED.platforms, is_active = true`,
      [케이스, JSON.stringify(입력스키마), JSON.stringify(기대스키마)],
    );
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = $1', [케이스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  beforeEach(치우기);

  const 실행 = (env: string, params: Record<string, unknown> = {}) =>
    createRun({ title: 'XAF 실행', triggeredBy: 'xaf', env, items: [{ tcId: 케이스, platforms: ['desktop'], params, expected: {} }] });
  const 항목값 = async (runId: number) =>
    (await q('SELECT params, expected FROM run_item WHERE run_id = $1', [runId])).rows[0] as {
      params: Record<string, unknown>;
      expected: Record<string, unknown>;
    };

  it('저장값 없는 로그인 케이스는 그 실행 env 의 일반 회원 · 역할 계정으로 채우고 run_item 에 박제한다', async () => {
    const run = await 실행('qa', { note: '메모' });
    const 채움 = { note: '메모', userId: 'member', password: 'pw-member', adminId: 'admin', adminPw: 'pw-admin' };
    expect(await 항목값(run.runId)).toEqual({ params: 채움, expected: {} });
    expect(run.items[0]!.params).toEqual(채움);

    // 계정을 나중에 바꿔도 지난 실행은 그대로다
    await q(`UPDATE service_env SET login_password = 'pw-바뀜' WHERE service_id = $1 AND env = 'qa'`, [서비스]);
    try {
      expect((await 항목값(run.runId)).params.password).toBe('pw-member');
    } finally {
      await q(`UPDATE service_env SET login_password = 'pw-member' WHERE service_id = $1 AND env = 'qa'`, [서비스]);
    }
  });

  it('그 역할 계정이 없는 칸 · 계정 칸이 아닌 비밀값(토큰) · 기대값은 비워 둔다', async () => {
    const { params, expected } = await 항목값((await 실행('qa')).runId);
    expect(params).not.toHaveProperty('sellerPw');
    expect(params).not.toHaveProperty('apiToken');
    expect(expected).toEqual({});
  });

  it('저장값이 있으면 저장값이 계정보다 앞선다', async () => {
    await q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, '{}', 'xaf')`, [
      케이스,
      JSON.stringify({ password: 'pw-저장', adminPw: 'pw-저장관리자' }),
    ]);
    const { params } = await 항목값((await 실행('qa')).runId);
    expect(params).toMatchObject({ userId: 'member', password: 'pw-저장', adminId: 'admin', adminPw: 'pw-저장관리자' });
  });

  it('요청 값이 저장값 · 계정보다 앞서고 빈 글자로 보낸 칸도 그대로 둔다', async () => {
    await q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, '{}', 'xaf')`, [
      케이스,
      JSON.stringify({ password: 'pw-저장' }),
    ]);
    const { params } = await 항목값((await 실행('qa', { password: 'pw-요청', userId: '' })).runId);
    expect(params).toMatchObject({ password: 'pw-요청', userId: '', adminId: 'admin' });
  });

  it('다른 env 의 계정은 쓰지 않는다 — 그 실행 env 줄의 역할 계정만', async () => {
    const { params } = await 항목값((await 실행('stg')).runId);
    expect(params).toEqual({ userId: 'stg-member', password: 'pw-stg', sellerPw: 'pw-seller' });
  });

  it('운영 줄도 채운다 — 실행은 운영에서도 돈다', async () => {
    const { params } = await 항목값((await 실행('live')).runId);
    expect(params).toEqual({ userId: 'live-member', password: 'pw-live' });
  });

  it('대상 서버계정은 일반 회원 다음 역할 계정이고 없는 줄은 빈 목록이다', async () => {
    const { pool } = await import('../db/index.js');
    expect(await 대상서버계정(pool, 서비스, 'qa')).toEqual([
      { role: '일반 회원', loginId: 'member', loginPassword: 'pw-member' },
      { role: '관리자', loginId: 'admin', loginPassword: 'pw-admin' },
    ]);
    expect(await 대상서버계정(pool, 서비스, 'none')).toEqual([]);
  });

  it('시나리오 case 부품도 같은 차례로 채우고 값 꽂기 칸은 계정으로 안 채운다', async () => {
    const { pool } = await import('../db/index.js');
    const 부품: ScenarioPart = {
      kind: 'case',
      tcId: 케이스,
      params: { adminPw: 'pw-조립' },
      expected: {},
      skipSteps: [],
      links: [{ kind: 'bind', param: 'userId', value: { fromSeq: 1, method: 'GET', urlPattern: '**/api/me', jsonPath: 'data.id' } }],
    };
    const 케이스들 = new Map([[케이스, { param_schema: 입력스키마, expected_schema: 기대스키마 }]]);
    const [찬] = await 부품채우기(pool, [부품], 케이스들, await 대상서버계정(pool, 서비스, 'qa'));
    expect(찬).toMatchObject({ params: { adminPw: 'pw-조립', password: 'pw-member', adminId: 'admin' } });
    expect(찬).not.toHaveProperty('params.userId');
  });
});
