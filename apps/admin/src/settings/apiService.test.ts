// 설정 API 의 API 애플리케이션 칸 — 종류는 만들 때만 · 문서 경로 · 기준 서버 · API 인증 저장과 비밀값 끝 4자리 · 거절 코드
// (SPEC 도메인/인증 §7 · 도메인/API §3.8 「API 인증」). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAK';
const 화면접두사 = 'XAKS';
const 비밀값A = 'secret-A-원문-xak-0001';
const 비밀값B = 'secret-B-원문-xak-0002';

type 서비스응답 = {
  id: number;
  prefix: string;
  kind: string;
  apiDocPath: string | null;
  apiDocEnv: string | null;
  envs: { env: string; apiAuths: Record<string, string>[] }[];
};

describe.skipIf(연결 === undefined)('설정 API 의 API 애플리케이션 칸', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
  const 로그: string[] = [];
  let 번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 치운다(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = ANY($1))', [[접두사, 화면접두사]]);
    await p.query('DELETE FROM service WHERE prefix = ANY($1)', [[접두사, 화면접두사]]);
    await 검사프로젝트치우기();
  }

  const 만든다 = async (본문: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: { name: 'XAK API', color: '#112233', projectId: await 검사프로젝트(), testsRepo: '', testsDir: 'xak', ...본문 },
    });
  const 고친다 = async (본문: Record<string, unknown>, id = 번호) =>
    app.inject({ method: 'PATCH', url: `/api/settings/services/${String(id)}`, payload: 본문 });
  async function 읽는다(prefix = 접두사): Promise<서비스응답 | undefined> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: 서비스응답[] }>().items.find((s) => s.prefix === prefix);
  }
  const 인증 = (name: string, clientSecret?: string) => ({ name, tokenUrl: '/oauth/token', clientId: `${name}-id`, ...(clientSecret ? { clientSecret } : {}) });

  const 처음envs = [{ env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths: [인증('고객사 A', 비밀값A), 인증('고객사 B', 비밀값B)] }];

  // DB 가 느린 날에도 버티게 서비스는 한 번만 만들고 검사마다 칸을 되돌린다
  beforeAll(async () => {
    app = Fastify({ logger: { level: 'trace', stream: { write: (줄: string) => void 로그.push(줄) } } });
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
    const res = await 만든다({ prefix: 접두사, kind: 'API', apiDocPath: '/openapi.json', apiDocEnv: 'stg', envs: 처음envs });
    expect(res.statusCode).toBe(201);
    번호 = res.json<{ id: number }>().id;
  }, 60_000);

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  }, 60_000);

  beforeEach(async () => {
    expect((await 고친다({ apiDocPath: '/openapi.json', apiDocEnv: 'stg', envs: 처음envs })).statusCode).toBe(200);
  }, 30_000);

  it('API 애플리케이션을 만들면 종류 · 문서 경로 · 기준 서버가 남고 인증은 비밀값 끝 4자리만 돌려준다', async () => {
    expect(await 읽는다()).toMatchObject({
      kind: 'API',
      apiDocPath: '/openapi.json',
      apiDocEnv: 'stg',
      envs: [
        {
          env: 'stg',
          apiAuths: [
            { name: '고객사 A', tokenUrl: '/oauth/token', clientId: '고객사 A-id', clientSecretLast4: '0001' },
            { name: '고객사 B', tokenUrl: '/oauth/token', clientId: '고객사 B-id', clientSecretLast4: '0002' },
          ],
        },
      ],
    });
    const 응답글 = (await app.inject({ method: 'GET', url: '/api/settings/services' })).body;
    expect(응답글).not.toContain(비밀값A);
    expect(로그.join('\n')).not.toContain(비밀값A);
  });

  it('kind 를 안 보내면 화면 애플리케이션이고, 화면 애플리케이션은 API 칸을 못 받는다', async () => {
    expect((await 만든다({ prefix: 화면접두사, envs: [] })).statusCode).toBe(201);
    expect((await 읽는다(화면접두사))?.kind).toBe('SCREEN');
    const 화면 = (await 읽는다(화면접두사))!.id;
    expect((await 고친다({ apiDocPath: '/openapi.json' }, 화면)).json()).toEqual({ error: 'NOT_API_SERVICE' });
    expect((await 고친다({ envs: [{ env: 'qa', baseUrl: 'http://x', apiAuths: [인증('A', 비밀값A)] }] }, 화면)).json()).toEqual({
      error: 'NOT_API_SERVICE',
    });
    expect((await 고친다({ envs: [{ env: 'qa', baseUrl: 'http://x', apiAuths: [] }] }, 화면)).statusCode).toBe(200);
  });

  it('kind 는 SCREEN · API 만 받고 고치기로는 바꿀 수 없다', async () => {
    expect((await 만든다({ prefix: 화면접두사, kind: 'GRPC', envs: [] })).json()).toEqual({ error: 'BAD_KIND' });
    expect((await 고친다({ kind: 'SCREEN' })).json()).toEqual({ error: 'KIND_IMMUTABLE' });
    expect((await 읽는다())?.kind).toBe('API');
  });

  it('비밀값을 안 보낸 줄은 같은 이름의 옛 비밀값을 잇고, 키가 없으면 인증을 통째로 유지한다', async () => {
    expect((await 고친다({ envs: [{ env: 'stg', baseUrl: 'http://127.0.0.1:3004' }] })).statusCode).toBe(200);
    expect((await 읽는다())?.envs[0]?.apiAuths.map((a) => a.clientSecretLast4)).toEqual(['0001', '0002']);

    const res = await 고친다({ envs: [{ env: 'stg', baseUrl: 'http://127.0.0.1:3004', apiAuths: [{ ...인증('고객사 A'), clientId: '새 아이디' }] }] });
    expect(res.statusCode).toBe(200);
    const 저장 = await (await pool()).query<{ api_auths: unknown }>('SELECT api_auths FROM service_env WHERE service_id = $1', [번호]);
    expect(저장.rows[0]?.api_auths).toEqual([{ name: '고객사 A', tokenUrl: '/oauth/token', clientId: '새 아이디', clientSecret: 비밀값A }]);
  });

  it('이어받을 비밀값이 없는 새 이름은 API_AUTH_SECRET_REQUIRED 이고 저장이 통째로 안 된다', async () => {
    const res = await 고친다({ envs: [{ env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths: [인증('고객사 C')] }] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'API_AUTH_SECRET_REQUIRED' });
    expect((await 읽는다())?.envs[0]?.apiAuths).toHaveLength(2);
  });

  it('토큰 주소를 바꾸면서 비밀값을 안 보내면 옛 비밀값을 잇지 않는다 — 원문이 다른 주소로 가지 않게', async () => {
    const res = await 고친다({
      envs: [{ env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths: [{ ...인증('고객사 A'), tokenUrl: 'https://다른곳.test/token' }] }],
    });
    expect(res.json()).toEqual({ error: 'API_AUTH_SECRET_REQUIRED' });
  });

  it('인증 칸 규칙을 어기면 BAD_API_AUTH', async () => {
    const 보내기 = (apiAuths: unknown[]) => 고친다({ envs: [{ env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths }] });
    for (const 틀린것 of [
      [인증('', 비밀값A)],
      [인증('스물한 글자가 넘는 아주 긴 인증 이름이다', 비밀값A)],
      [인증('A', 비밀값A), 인증(' A ', 비밀값B)],
      [{ ...인증('A', 비밀값A), tokenUrl: 'auth.test/token' }],
      [{ ...인증('A', 비밀값A), tokenUrl: '//auth.test/token' }],
      [{ ...인증('A', 비밀값A), clientId: '' }],
      [인증('A', 'short')],
      Array.from({ length: 11 }, (_, i) => 인증(`A${String(i)}`, 비밀값A)),
    ]) {
      expect((await 보내기(틀린것)).json(), JSON.stringify(틀린것).slice(0, 80)).toEqual({ error: 'BAD_API_AUTH' });
    }
  });

  it('문서 경로는 / 로 시작해야 하고 기준 서버는 대상 서버 줄 하나여야 한다 — envs 만 고쳐 기준 줄을 빼도 막는다', async () => {
    expect((await 고친다({ apiDocPath: 'openapi.json' })).json()).toEqual({ error: 'BAD_API_DOC_URL' });
    expect((await 고친다({ apiDocEnv: 'prod' })).json()).toEqual({ error: 'BAD_API_DOC_URL' });
    expect((await 고친다({ envs: [{ env: 'qa', baseUrl: 'http://x' }] })).json()).toEqual({ error: 'BAD_API_DOC_URL' });
    expect((await 고친다({ apiDocPath: null, apiDocEnv: null })).statusCode).toBe(200);
    expect(await 읽는다()).toMatchObject({ apiDocPath: null, apiDocEnv: null });
  });
});
