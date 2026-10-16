// 대상 서버 줄의 역할 계정 · 운영 서버 표시 저장 — 더하기 · 키 없음 유지 · 이름 같은 역할 이어받기 · 빼면 지움 · BAD_ROLE · 비밀번호 원문이 안 나감
// (SPEC 도메인/인증 §7 「envs[] 한 줄」). CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRA';
const 관리자비번 = 'pw-관리자-XRA-원문';
const 판매자비번 = 'pw-판매자-XRA-원문';

type 줄응답 = { env: string; isProd: boolean; accounts: { role: string; loginId: string | null; hasLoginPassword: boolean }[] };

describe.skipIf(연결 === undefined)('대상 서버 줄의 역할 계정 · 운영 서버', () => {
  let app: FastifyInstance;
  const 로그: string[] = [];
  let 번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 치운다(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = $1)', [접두사]);
    await p.query('DELETE FROM service WHERE prefix = $1', [접두사]);
  }

  async function 줄들(): Promise<줄응답[]> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: { id: number; envs: 줄응답[] }[] }>().items.find((s) => s.id === 번호)?.envs ?? [];
  }

  const 고친다 = async (envs: Record<string, unknown>[]) =>
    app.inject({ method: 'PATCH', url: `/api/settings/services/${String(번호)}`, payload: { envs } });

  async function 저장된것(env: string): Promise<{ is_prod: boolean; role_accounts: unknown } | undefined> {
    const r = await (await pool()).query<{ is_prod: boolean; role_accounts: unknown }>(
      'SELECT is_prod, role_accounts FROM service_env WHERE service_id = $1 AND env = $2',
      [번호, env],
    );
    return r.rows[0];
  }

  beforeAll(async () => {
    // 본문이 로그로 새는지 보려고 가장 자세한 단계로 받아 둔다
    app = Fastify({ logger: { level: 'trace', stream: { write: (줄: string) => void 로그.push(줄) } } });
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  });

  beforeEach(async () => {
    await 치운다();
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix: 접두사,
        name: 'XRA 역할 계정',
        color: '#112233',
        testsRepo: 'https://example.com/xra.git',
        testsDir: 'xra',
        envs: [
          {
            env: 'qa',
            baseUrl: 'https://qa.xra.test',
            loginId: 'member',
            loginPassword: 'pw-일반',
            accounts: [{ role: ' 관리자 ', loginId: 'admin', loginPassword: 관리자비번 }],
          },
          { env: 'live', baseUrl: 'https://xra.test', isProd: true },
        ],
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    번호 = res.json<{ id: number }>().id;
  });

  it('역할 계정을 더하면 응답에 아이디와 설정 여부만 실리고 역할 이름은 앞뒤 공백을 뗀다', async () => {
    expect(await 줄들()).toMatchObject([
      { env: 'live', isProd: true, accounts: [] },
      { env: 'qa', isProd: false, accounts: [{ role: '관리자', loginId: 'admin', hasLoginPassword: true }] },
    ]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([{ role: '관리자', loginId: 'admin', loginPassword: 관리자비번 }]);

    const 더함 = await 고친다([
      { env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자' }, { role: '판매자', loginId: 'seller', loginPassword: 판매자비번 }] },
      { env: 'live', baseUrl: 'https://xra.test' },
    ]);
    expect(더함.statusCode).toBe(200);
    expect((await 줄들()).find((e) => e.env === 'qa')?.accounts).toEqual([
      { role: '관리자', loginId: 'admin', hasLoginPassword: true },
      { role: '판매자', loginId: 'seller', hasLoginPassword: true },
    ]);
  });

  it('accounts 키가 없으면 역할 계정을 통째로 유지하고 isProd 키가 없으면 운영 표시를 유지한다', async () => {
    expect((await 고친다([{ env: 'qa', baseUrl: 'https://qa2.xra.test' }, { env: 'live', baseUrl: 'https://xra.test' }])).statusCode).toBe(200);
    expect(await 저장된것('qa')).toEqual({
      is_prod: false,
      role_accounts: [{ role: '관리자', loginId: 'admin', loginPassword: 관리자비번 }],
    });
    expect((await 저장된것('live'))?.is_prod).toBe(true);
  });

  it('isProd 를 보내면 바꾸고, 새 줄은 false 로 시작한다', async () => {
    expect(
      (await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', isProd: true }, { env: 'live', baseUrl: 'https://xra.test', isProd: false }, { env: 'stg', baseUrl: 'https://stg.xra.test' }])).statusCode,
    ).toBe(200);
    expect((await 줄들()).map((e) => [e.env, e.isProd])).toEqual([['live', false], ['qa', true], ['stg', false]]);
  });

  it('isProd 없이 새로 더한 줄은 이름이 prod · production · 운영 이면 운영으로 시작한다', async () => {
    expect((await 고친다([{ env: 'prod', baseUrl: 'https://prod.xra.test' }, { env: '운영', baseUrl: 'https://op.xra.test' }, { env: 'dev', baseUrl: 'https://dev.xra.test' }])).statusCode).toBe(200);
    expect(Object.fromEntries((await 줄들()).map((e) => [e.env, e.isProd]))).toEqual({ dev: false, prod: true, 운영: true });
  });

  it('이름이 같은 역할은 비밀번호를 이어받고 null · 공백뿐이면 지운다', async () => {
    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자', loginId: 'admin2' }] }]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([{ role: '관리자', loginId: 'admin2', loginPassword: 관리자비번 }]);

    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자', loginPassword: '   ' }] }]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([{ role: '관리자', loginId: 'admin2', loginPassword: null }]);

    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자', loginId: null }] }]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([{ role: '관리자', loginId: null, loginPassword: null }]);
  });

  it('화면 크기 판정은 설정 저장에 안 지워지고, 주소를 바꾼 줄은 다음 크롤까지 비운다 (PRD-F10-07)', async () => {
    const p = await pool();
    await p.query("UPDATE service_env SET viewport_kind = 'responsive', viewport_judged_at = '2026-10-16T00:00:00Z' WHERE service_id = $1", [번호]);
    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test' }, { env: 'live', baseUrl: 'https://new.xra.test' }]);
    const r = await p.query<{ env: string; viewport_kind: string | null; viewport_judged_at: Date | null }>(
      'SELECT env, viewport_kind, viewport_judged_at FROM service_env WHERE service_id = $1 ORDER BY env',
      [번호],
    );
    expect(r.rows).toEqual([
      { env: 'live', viewport_kind: null, viewport_judged_at: null },
      { env: 'qa', viewport_kind: 'responsive', viewport_judged_at: new Date('2026-10-16T00:00:00Z') },
    ]);
  });

  it('다른 env 이름의 줄 · 다른 역할 이름은 이어받지 않는다', async () => {
    await 고친다([{ env: 'qa2', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자' }] }]);
    expect((await 저장된것('qa2'))?.role_accounts).toEqual([{ role: '관리자', loginId: null, loginPassword: null }]);
  });

  it('목록에서 뺀 역할은 지운다', async () => {
    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [] }]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([]);
    expect((await 줄들()).find((e) => e.env === 'qa')?.accounts).toEqual([]);
  });

  it.each([
    ['빈 이름', [{ role: '  ' }]],
    ['「일반 회원」', [{ role: '일반 회원' }]],
    ['한 줄 안에서 겹침', [{ role: '관리자' }, { role: ' 관리자' }]],
    ['40자 넘음', [{ role: '가'.repeat(41) }]],
    ['21개', Array.from({ length: 21 }, (_, i) => ({ role: `역할${String(i)}` }))],
  ])('역할 이름이 %s 이면 400 BAD_ROLE 이고 저장하지 않는다', async (_, accounts) => {
    const res = await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts }]);
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_ROLE' }]);
    expect((await 저장된것('qa'))?.role_accounts).toEqual([{ role: '관리자', loginId: 'admin', loginPassword: 관리자비번 }]);
  });

  it('새 서비스도 역할 이름이 어긋나면 400 BAD_ROLE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: { prefix: 접두사, name: 'x', color: '#112233', testsRepo: '', testsDir: 'x', envs: [{ env: 'qa', baseUrl: 'https://q', accounts: [{ role: '일반 회원' }] }] },
    });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_ROLE' }]);
  });

  it('역할 계정 비밀번호 원문은 목록 응답 · 400 본문 · 로그 어디에도 없다', async () => {
    await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '관리자' }, { role: '판매자', loginPassword: 판매자비번 }] }]);
    const 목록 = await app.inject({ method: 'GET', url: '/api/settings/services' });
    expect(목록.body).not.toContain(관리자비번);
    expect(목록.body).not.toContain(판매자비번);

    const 틀린모양 = await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: 3, loginPassword: 판매자비번 }] }]);
    expect(틀린모양.statusCode).toBe(400);
    expect(틀린모양.body).not.toContain(판매자비번);
    const 틀린역할 = await 고친다([{ env: 'qa', baseUrl: 'https://qa.xra.test', accounts: [{ role: '', loginPassword: 판매자비번 }] }]);
    expect(틀린역할.body).not.toContain(판매자비번);

    expect(로그.length).toBeGreaterThan(0);
    expect(로그.join('\n')).not.toContain(관리자비번);
    expect(로그.join('\n')).not.toContain(판매자비번);
  });
});
