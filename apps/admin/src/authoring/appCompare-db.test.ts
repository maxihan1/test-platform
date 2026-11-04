// Android 앱 · 게임 「실제 화면과 대조」 요청 검사 — 만들기 · 재실행 판정 · 집기 target (SPEC 도메인/작성 §3.6 「★ 역방향」 「앱 · 게임 역방향」 · §7 AUTHOR)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import { 역방향칸판정 } from './reverse.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAX';
const 비밀 = 'xax-비밀번호-원문-3f1';

describe.skipIf(연결 === undefined)('Android 앱 대조 요청', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 부르는이 = `${접두사.toLowerCase()}-에이전트`;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 만들기 = (몸: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'AUTHOR', ...몸 } });
  const 거절 = async (몸: Record<string, unknown>) => (await 만들기(몸)).json<{ error?: string }>().error;
  const 행 = async (id: number) =>
    (await q<{ compare: boolean; env: string | null; start_url: string | null }>('SELECT compare, env, start_url FROM authoring_request WHERE id = $1', [id])).rows[0]!;

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAX 앱 대조 검사용', '#3A5FCD', '', 'xax', 'APP') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    // qa 는 앱 파일 · 계정이 있고, noacc 는 스토어 앱 패키지 이름만, apk 는 계정 없이 앱 파일만(게임은 패키지 이름을 안 받는다), dev 는 켤 앱이 없고, live 는 실서비스 서버다
    await q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, app_path) VALUES
         ($1, 'qa', 'http://qa.xax.test', 'tester', $2, false, '/apk/qa.apk'),
         ($1, 'noacc', 'http://noacc.xax.test', NULL, NULL, false, 'com.xax.shop'),
         ($1, 'apk', 'http://apk.xax.test', NULL, NULL, false, '/apk/apk.apk'),
         ($1, 'dev', 'http://dev.xax.test', 'tester', $2, false, NULL),
         ($1, 'live', 'http://live.xax.test', 'tester', $2, true, '/apk/live.apk')`,
      [서비스, 비밀],
    );

    process.env.AUTHORING_AGENT_USER = 부르는이;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '앱 대조 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  // 앞 검사가 세운 요청이 열려 있으면 다음 요청이 AUTHORING_OPEN 으로 막힌다. 앞 검사가 올린 빌드가 남으면 켤 앱이 없던 줄에 앱이 생긴다
  beforeEach(async () => {
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM app_build WHERE service_id = $1', [서비스]);
    await q(`UPDATE service SET kind = 'APP' WHERE id = $1`, [서비스]);
  });

  afterAll(async () => {
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM app_build WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('켤 앱이 있는 줄로 대조를 켜면 201 이고 시작 주소 없이 선다 — 테스트 계정이 없는 줄도 된다', async () => {
    for (const env of ['qa', 'noacc']) {
      const 답 = await 만들기({ compare: true, env });
      expect(답.statusCode).toBe(201);
      expect(await 행(답.json<{ id: number }>().id)).toEqual({ compare: true, env, start_url: null });
      await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    }
  });

  it('시작 주소 · 실서비스 서버 줄 · 켤 앱이 없는 줄 · 없는 줄은 400 BAD_ENV 이고 DRAFT 도 안 남는다', async () => {
    expect(await 거절({ compare: true, env: 'qa', startUrl: 'http://qa.xax.test/' })).toBe('BAD_ENV');
    expect(await 거절({ startUrl: 'http://qa.xax.test/' })).toBe('BAD_ENV');
    expect(await 거절({ compare: true, env: 'live' })).toBe('BAD_ENV');
    expect(await 거절({ compare: true, env: 'dev' })).toBe('BAD_ENV');
    expect(await 거절({ compare: true, env: 'gone' })).toBe('BAD_ENV');
    expect(await 거절({ compare: true })).toBe('BAD_ENV');
    expect((await q('SELECT 1 FROM authoring_request WHERE service_id = $1', [서비스])).rowCount).toBe(0);
  });

  it('앱 파일 경로가 없어도 그 줄에 올린 빌드가 있으면 켤 앱이 있다', async () => {
    expect(await 역방향칸판정({ compare: true, env: 'dev' }, 서비스)).toEqual({ error: 'BAD_ENV' });
    // 배포 신호만 남긴 빌드 행(파일도 주소도 없다)은 켤 앱이 아니다 — 앱 화면 통로도 그 줄을 「앱 없는 서비스」로 본다
    await q(`INSERT INTO app_build (service_id, env, build_no, uploaded_by, uploaded_at) VALUES ($1, 'dev', 'xax-0', 'xax', now() - interval '1 hour')`, [서비스]);
    expect(await 역방향칸판정({ compare: true, env: 'dev' }, 서비스)).toEqual({ error: 'BAD_ENV' });
    await q(`INSERT INTO app_build (service_id, env, build_no, app_url, uploaded_by) VALUES ($1, 'dev', 'xax-1', 'https://builds.xax.test/1.apk', 'xax')`, [서비스]);
    expect(await 역방향칸판정({ compare: true, env: 'dev' }, 서비스)).toEqual({ compare: true, env: 'dev', startUrl: null });
  });

  it('게임 애플리케이션도 같은 규칙으로 대조를 받는다 — 테스트 계정 없는 APK 줄도 되고 시작 주소 · 실서비스 · 켤 앱 없는 줄 · 패키지 이름뿐인 줄은 막는다', async () => {
    await q(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [서비스]);
    for (const env of ['qa', 'apk']) expect(await 역방향칸판정({ compare: true, env }, 서비스)).toEqual({ compare: true, env, startUrl: null });
    expect(await 역방향칸판정({ compare: true, env: 'qa', startUrl: 'http://qa.xax.test/' }, 서비스)).toEqual({ error: 'BAD_ENV' });
    // noacc 는 스토어 패키지 이름뿐이다 — 게임은 SDK 를 넣은 QA 빌드라야 해서 켤 앱이 없는 줄로 본다
    for (const env of ['live', 'dev', 'gone', 'noacc']) expect(await 역방향칸판정({ compare: true, env }, 서비스)).toEqual({ error: 'BAD_ENV' });
    expect(await 역방향칸판정({}, 서비스)).toEqual({ compare: false });
    const 답 = await 만들기({ compare: true, env: 'apk' });
    expect(답.statusCode).toBe(201);
    expect(await 행(답.json<{ id: number }>().id)).toEqual({ compare: true, env: 'apk', start_url: null });
  });

  it('집기 target 은 시작 주소 없이 그 줄의 서버 · 계정이고 accounts 도 그 줄이 맨 앞이다', async () => {
    const { id } = (await 만들기({ compare: true, env: 'qa' })).json<{ id: number }>();
    await q(`UPDATE authoring_request SET status = 'PENDING' WHERE id = $1`, [id]);

    const 집음 = (await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` })).json<{ target?: unknown; accounts?: { env: string }[] }>();

    expect(집음.target).toEqual({ env: 'qa', baseUrl: 'http://qa.xax.test', startUrl: null, loginId: 'tester', loginPassword: 비밀 });
    expect(집음.accounts?.map((a) => a.env)).toEqual(['qa']);
  });
});
