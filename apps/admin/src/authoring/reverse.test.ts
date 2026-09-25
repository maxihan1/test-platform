// 역방향 작성 요청 검사 — 시작 주소 · 만들기 · 줄 세우기 · 목록/상세 칸 · 집기 target · diffs (SPEC 도메인/작성 §3.6 「★ 역방향」 · §7)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import assetRoutes from './assets.js';
import { 시작주소 } from './reverse.js';
import authoringRoutes from './routes.js';
import { 한건 } from './store.js';

describe('시작주소 — 대상 서버와 출처가 같은 http·https 주소만 다시 조립해 받는다', () => {
  const 서버 = 'https://qa.example.com';

  it('같은 출처면 다시 조립한 href 를 준다', () => {
    expect(시작주소('https://qa.example.com/orders?tab=1#top', 서버)).toBe('https://qa.example.com/orders?tab=1#top');
    expect(시작주소('https://QA.example.com:443/a', 서버)).toBe('https://qa.example.com/a');
  });

  it('서버 주소에 경로가 있어도 출처만 본다', () => {
    expect(시작주소('https://qa.example.com/login', 'https://qa.example.com/app/')).toBe('https://qa.example.com/login');
  });

  it('출처가 다르면 받지 않는다 — 호스트·포트·scheme', () => {
    expect(시작주소('https://evil.example.com/', 서버)).toBeNull();
    expect(시작주소('https://qa.example.com:8443/', 서버)).toBeNull();
    expect(시작주소('http://qa.example.com/', 서버)).toBeNull();
  });

  it('http·https 밖은 받지 않는다', () => {
    expect(시작주소('javascript:alert(1)', 서버)).toBeNull();
    expect(시작주소('file:///etc/passwd', 'file:///etc/')).toBeNull();
  });

  it('아이디·비밀번호가 박힌 주소(user:pass@)는 받지 않는다', () => {
    expect(시작주소('https://a:b@qa.example.com/', 서버)).toBeNull();
    expect(시작주소('https://a@qa.example.com/', 서버)).toBeNull();
  });

  it('주소가 아니거나 글자가 아니면 받지 않는다', () => {
    expect(시작주소('orders', 서버)).toBeNull();
    expect(시작주소(42, 서버)).toBeNull();
    expect(시작주소(undefined, 서버)).toBeNull();
  });

  it('서버 주소가 깨져 있어도 던지지 않고 받지 않는다', () => {
    expect(시작주소('https://qa.example.com/', '깨진 주소')).toBeNull();
    expect(시작주소('https://qa.example.com/', null)).toBeNull();
  });
});

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWV';
const 비밀 = 'xwv-비밀번호-원문-9f3';

describe.skipIf(연결 === undefined)('역방향 작성 요청', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 부르는이 = `${접두사.toLowerCase()}-에이전트`;

  const 만들기 = (본문: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: 본문 });

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwv', 'xwv')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 역방향 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password) VALUES
         ($1, 'qa', 'https://qa.xwv.test', 'tester', $2),
         ($1, 'prod', 'https://xwv.test', NULL, NULL),
         ($1, 'idonly', 'https://id.xwv.test', 'tester', NULL),
         ($1, 'pwonly', 'https://pw.xwv.test', NULL, $2),
         ($1, 'blank', 'https://blank.xwv.test', '', ''),
         ($1, 'broken', '깨진 주소', 'tester', $2)`,
      [서비스, 비밀],
    );

    process.env.AUTHORING_AGENT_USER = 부르는이;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '역방향 검사', role: 'operator' as const, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(assetRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('만들기', () => {
    it('계정이 둘 다 있는 줄을 고르면 201 이고 행에 대조 칸이 선다', async () => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', startUrl: 'https://QA.xwv.test:443/orders' });
      expect(res.statusCode).toBe(201);
      const 행 = await 한건(res.json<{ id: number }>().id);
      expect(행).toMatchObject({ compare: true, env: 'qa', startUrl: 'https://qa.xwv.test/orders', status: 'DRAFT' });
    });

    it('시작 주소 없이 대조만 켜도 된다', async () => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa' });
      expect(res.statusCode).toBe(201);
      expect(await 한건(res.json<{ id: number }>().id)).toMatchObject({ compare: true, env: 'qa', startUrl: null });
    });

    it('대조를 안 켜면 칸이 비어 있다', async () => {
      const res = await 만들기({ kind: 'AUTHOR' });
      expect(await 한건(res.json<{ id: number }>().id)).toMatchObject({ compare: false, env: null, startUrl: null });
    });

    it.each(['prod', 'idonly', 'pwonly', 'blank', 'none'])('테스트 계정이 없는 줄(%s)은 400 BAD_ENV — 운영 서버로 못 간다', async (env) => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_ENV' });
    });

    it('대조인데 대상 서버가 없으면 400 BAD_ENV', async () => {
      expect((await 만들기({ kind: 'AUTHOR', compare: true })).json()).toEqual({ error: 'BAD_ENV' });
    });

    it('compare 가 참·거짓이 아니면 400 BAD_ENV', async () => {
      const res = await 만들기({ kind: 'AUTHOR', compare: 'yes', env: 'qa' });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_ENV' });
    });

    it('대조가 아닌데 대상 서버만 오면 400 BAD_ENV', async () => {
      expect((await 만들기({ kind: 'AUTHOR', env: 'qa' })).json()).toEqual({ error: 'BAD_ENV' });
    });

    it('대조가 아닌데 시작 주소가 오면 400 BAD_START_URL', async () => {
      const res = await 만들기({ kind: 'AUTHOR', env: 'qa', startUrl: 'https://qa.xwv.test/' });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_START_URL' });
    });

    it.each([
      'https://evil.test/',
      'https://tester:pw@qa.xwv.test/',
      'javascript:alert(1)',
      '/orders',
    ])('시작 주소 %s 는 400 BAD_START_URL', async (startUrl) => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', startUrl });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_START_URL' });
    });

    it('대상 서버 주소가 깨져 있으면 500 이 아니라 400 BAD_START_URL', async () => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env: 'broken', startUrl: 'https://qa.xwv.test/' });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_START_URL' });
    });

    it('400 응답 본문에 비밀번호 원문이 없다', async () => {
      const res = await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', startUrl: 'https://evil.test/' });
      expect(res.body).not.toContain(비밀);
    });
  });

  describe('줄에 세우기', () => {
    const 세우기 = (id: number) => app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/submit` });

    it('화면만(대조 + 시작 주소)은 자료 0 이어도 선다', async () => {
      const id = (await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', startUrl: 'https://qa.xwv.test/' })).json<{ id: number }>().id;
      expect((await 세우기(id)).statusCode).toBe(200);
      expect((await 한건(id))?.status).toBe('PENDING');
    });

    it('대조만 켜고 시작 주소가 없으면 자료 0 은 409 NO_ASSETS', async () => {
      const id = (await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa' })).json<{ id: number }>().id;
      const res = await 세우기(id);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'NO_ASSETS' });
    });
  });

  describe('목록·상세', () => {
    it('목록 items 에 compare·env·startUrl 이 있고 계정은 어디에도 없다', async () => {
      const id = (await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', startUrl: 'https://qa.xwv.test/list' })).json<{ id: number }>().id;
      const res = await app.inject({ method: 'GET', url: `/api/authoring/requests?service=${접두사}` });
      const 줄 = res.json<{ items: Record<string, unknown>[] }>().items.find((i) => i.id === id);
      expect(줄).toMatchObject({ compare: true, env: 'qa', startUrl: 'https://qa.xwv.test/list' });
      expect(res.body).not.toContain(비밀);
      expect(res.body).not.toContain('loginId');
      expect(res.body).not.toContain('loginPassword');
    });

    it('상세에 역방향 칸이 있고 자료마다 role·sourceAssetId 가 있다 — 계정은 없다', async () => {
      const id = (await 만들기({ kind: 'AUTHOR', compare: true, env: 'qa', figma: ['https://www.figma.com/design/AbC123/'] })).json<{ id: number }>().id;
      const res = await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}` });
      expect(res.json()).toMatchObject({
        compare: true,
        env: 'qa',
        startUrl: null,
        assets: [{ kind: 'FIGMA', role: 'INPUT', sourceAssetId: null }],
      });
      expect(res.body).not.toContain(비밀);
      expect(res.body).not.toContain('loginPassword');
    });
  });

  describe('다시 돌리기', () => {
    async function 끝난원본(본문: Record<string, unknown>): Promise<number> {
      const { pool } = await import('../db/index.js');
      const id = (await 만들기(본문)).json<{ id: number }>().id;
      await pool.query(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [id]);
      return id;
    }

    it.each([{ compare: true }, { env: 'qa' }, { startUrl: 'https://qa.xwv.test/' }])(
      '재실행에 역방향 칸(%o)이 오면 400 BAD_ENV',
      async (칸) => {
        const 원본 = await 끝난원본({ kind: 'AUTHOR' });
        const res = await 만들기({ kind: 'RERUN', sourceId: 원본, ...칸 });
        expect(res.statusCode).toBe(400);
        expect(res.json()).toEqual({ error: 'BAD_ENV' });
      },
    );

    it('원본이 역방향이면 409 BAD_SOURCE — 역방향은 새 요청으로 넣는다', async () => {
      const 원본 = await 끝난원본({ kind: 'AUTHOR', compare: true, env: 'qa' });
      const res = await 만들기({ kind: 'RERUN', sourceId: 원본 });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ error: 'BAD_SOURCE' });
    });

    it('정방향 원본의 재실행은 그대로 된다', async () => {
      const 원본 = await 끝난원본({ kind: 'AUTHOR' });
      expect((await 만들기({ kind: 'RERUN', sourceId: 원본 })).statusCode).toBe(201);
    });
  });
});
