// BTS 자동 설정 통로 — 웹훅 · 규칙 둘 · 보드 칸을 만들고 다시 눌러도 두 벌 안 만든다 (도메인/BTS §7 「BTS 자동 설정」). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 대신PAT } from '../auth/delegatedPat.js';

import type { BTS응답, BTS자리 } from './client.js';
import btsLinkRoutes from './routes.js';

vi.mock('../auth/delegatedPat.js', () => ({
  대신PAT: vi.fn(async (누구: { userId: string } | { username: string }) => {
    if ('userId' in 누구 && 누구.userId === 'xbj-sub-down') throw new Error('Auth 에 닿지 못했다');
    return 'userId' in 누구 ? `pat_${누구.userId}` : `pat_${누구.username}`;
  }),
}));

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XBJ';
const 계정들 = ['xbj-linked', 'xbj-local', 'xbj-down', 'xbj-off'];

const 상태 = { DEPLOY_WAIT: 'ready', QA_REQUEST: 'qa-req', QA_REVIEW: 'qa-review', DEV_REQUEST: 'todo', CODE_REVIEW: 'review', CLOSED: 'done' };
const 해결 = { SCREEN_RIGHT: "Won't Fix", TEST_PROBLEM: 'Test Issue', FLAKY: 'Flaky', ENV: 'Environment', DUPLICATE: 'Duplicate' };

interface 부름 {
  method: string;
  경로: string;
  열쇠: string;
  몸?: unknown;
}

describe.skipIf(연결 === undefined)('BTS 자동 설정', () => {
  let app: FastifyInstance;
  let 기본앱: FastifyInstance;
  let 누른사람 = 'xbj-linked';
  let 프로젝트 = 0;
  let 서비스 = 0;
  let 부른것: 부름[] = [];
  let 내토큰: string | undefined = 'pat_admin';
  let 웹훅답 = 200;
  let 규칙답 = 200;
  const 웹훅들: { id: string; url: string; version: number }[] = [];
  const 규칙: { id: string; name: string; version: number }[] = [];
  const 칸들: Record<string, { columnId: string; states: { key: string }[] }[]> = {};
  const 공개 = process.env.PLATFORM_PUBLIC_URL;

  const pool = async () => (await import('../db/index.js')).pool;
  const 누르기 = () => app.inject({ method: 'POST', url: `/api/settings/projects/${프로젝트}/bts/setup` });

  const 가짜BTS = async (자리: BTS자리, method: string, 경로: string, 몸?: unknown): Promise<BTS응답> => {
    부른것.push({ method, 경로, 열쇠: 'pat' in 자리 ? 자리.pat : `봇:${자리.봇}`, 몸 });
    if (경로.startsWith('/api/v1/webhooks')) {
      if (웹훅답 !== 200) return { status: 웹훅답, json: null };
      if (method === 'GET') return { status: 200, json: 웹훅들 };
      if (method === 'POST') {
        웹훅들.push({ id: 'w1', url: (몸 as { url: string }).url, version: 0 });
        return { status: 201, json: {} };
      }
      웹훅들[0]!.version += 1;
      return { status: 200, json: {} };
    }
    if (경로.includes('/automation/rules')) {
      if (규칙답 !== 200) return { status: 규칙답, json: null };
      if (method === 'GET') return { status: 200, json: 규칙 };
      if (method === 'POST') {
        규칙.push({ id: `r${규칙.length + 1}`, name: (몸 as { name: string }).name, version: 0 });
        return { status: 201, json: {} };
      }
      return { status: 200, json: {} };
    }
    if (경로 === '/api/v1/statuses') return { status: 200, json: { data: [{ key: 'qa-review', name: 'QA Review' }] } };
    if (경로 === '/api/v1/resolutions') return { status: 200, json: { data: [] } };
    if (경로.startsWith('/api/v1/boards?')) return { status: 200, json: { data: [{ boardId: 'b1' }, { boardId: 'b2' }] } };
    const 보드 = /^\/api\/v1\/boards\/(b\d)(\/columns)?$/.exec(경로);
    if (보드 !== null && method === 'GET') return { status: 200, json: { data: { columns: 칸들[보드[1]!] } } };
    if (보드 !== null && method === 'POST') {
      칸들[보드[1]!]!.push({ columnId: 'new', states: (몸 as { stateKeys: string[] }).stateKeys.map((key) => ({ key })) });
      return { status: 201, json: {} };
    }
    return { status: 404, json: null };
  };

  beforeAll(async () => {
    process.env.PLATFORM_PUBLIC_URL = 'https://qahub.example.com/';
    vi.stubEnv('AUTH_ISSUER', 'https://auth.example.com');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 's');
    vi.stubEnv('BTS_BOT_USERNAMES', 'qahub-ai');
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xbj-admin', displayName: '검사', role: 'admin' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(btsLinkRoutes, { prefix: '/api', 확인: async () => true, 부르기: 가짜BTS, 사람토큰: async () => 내토큰 });
    await app.ready();
    // 사람토큰을 안 넣은 판 — 누른 계정의 auth_sub 로 대신 PAT 를 받는 기본 길을 본다
    기본앱 = Fastify();
    기본앱.decorateRequest('user', null);
    기본앱.addHook('preHandler', async (req) => {
      req.user = { username: 누른사람, displayName: '검사', role: 'admin' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await 기본앱.register(btsLinkRoutes, { prefix: '/api', 부르기: 가짜BTS });
    await 기본앱.ready();
    const p = await pool();
    await p.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await p.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
            VALUES ('xbj-linked', '묶인 사람', NULL, 'admin', 'none', true, false, 'xbj-sub-linked', true),
                   ('xbj-local', '안 묶인 사람', 'scrypt$00$00', 'admin', 'none', true, false, NULL, true),
                   ('xbj-down', 'Auth 가 안 주는 사람', NULL, 'admin', 'none', true, false, 'xbj-sub-down', true),
                   ('xbj-off', '꺼진 사람', NULL, 'admin', 'none', true, false, 'xbj-sub-off', false)`,
    );
    프로젝트 = Number((await p.query<{ id: string }>(`INSERT INTO project (name) VALUES ('${접두사} 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await p.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#112233', '', 'xbj', $2) RETURNING id`,
          [접두사, 프로젝트],
        )
      ).rows[0]!.id,
    );
  });

  beforeEach(() => {
    부른것 = [];
    내토큰 = 'pat_admin';
    웹훅답 = 200;
    규칙답 = 200;
  });

  afterAll(async () => {
    if (공개 === undefined) delete process.env.PLATFORM_PUBLIC_URL;
    else process.env.PLATFORM_PUBLIC_URL = 공개;
    const p = await pool();
    // service 를 지우면 빈 프로젝트는 트리거가 지우고 bts_link 는 프로젝트와 같이 지워진다
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await p.query('DELETE FROM project WHERE id = $1', [프로젝트]);
    await p.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await app.close();
    await 기본앱.close();
    vi.unstubAllEnvs();
  });

  it('누른 사람의 대신 PAT 가 없거나 · 공개 주소가 없거나 · 연결 전이면 BTS 를 부르지 않는다', async () => {
    expect((await 누르기()).json()).toEqual({ error: 'NOT_LINKED' });
    내토큰 = undefined;
    expect((await 누르기()).json()).toEqual({ error: 'NO_PERSONAL_TOKEN' });
    내토큰 = 'pat_admin';
    process.env.PLATFORM_PUBLIC_URL = '';
    const 주소없음 = await 누르기();
    process.env.PLATFORM_PUBLIC_URL = 'https://qahub.example.com/';
    expect([주소없음.statusCode, 주소없음.json().error]).toEqual([400, 'PUBLIC_URL_REQUIRED']);
    expect(부른것).toEqual([]);
  });

  it('처음 누르면 웹훅 · 규칙 둘 · 「QA 검토」 칸이 없는 보드에만 칸을 만든다 — 전부 누른 사람 토큰으로', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/settings/projects/${프로젝트}/bts`,
      payload: { baseUrl: 'https://bts.example.com', btsProject: 'XBJ', botUsername: 'qahub-ai', statusMap: 상태, resolutionMap: 해결 },
    });
    expect(res.statusCode).toBe(200);
    칸들.b1 = [{ columnId: 'c1', states: [{ key: 'qa-review' }] }];
    칸들.b2 = [{ columnId: 'c2', states: [{ key: 'todo' }] }];

    const 첫 = await 누르기();
    expect(첫.statusCode).toBe(200);
    expect(첫.json().items).toEqual([
      { what: 'WEBHOOK', ok: true },
      { what: 'RULE_ASSIGNEE', ok: true },
      { what: 'RULE_PR', ok: true },
      { what: 'BOARD', ok: true },
    ]);
    expect(new Set(부른것.map((it) => it.열쇠))).toEqual(new Set(['pat_admin']));

    const p = await pool();
    const 행 = (await p.query<{ webhook_secret: string; rule_token_hash: string }>('SELECT webhook_secret, rule_token_hash FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0]!;
    const 만든웹훅 = 부른것.find((it) => it.method === 'POST' && it.경로 === '/api/v1/webhooks')!.몸;
    expect(만든웹훅).toMatchObject({
      url: `https://qahub.example.com/api/bts/events/${프로젝트}`,
      eventFilter: ['issue.created', 'issue.transitioned'],
      secret: 행.webhook_secret,
      projectKey: 'XBJ',
    });

    const 만든규칙 = 부른것.filter((it) => it.method === 'POST' && it.경로.endsWith('/automation/rules')).map((it) => it.몸 as { triggerType: string; actions: { config: string }[] });
    expect(만든규칙.map((it) => it.triggerType).sort()).toEqual(['ISSUE_ASSIGNED', 'PR_MERGED']);
    const config = JSON.parse(만든규칙[0]!.actions[0]!.config) as { url: string; headers: Record<string, string>; body: string };
    expect(config.url).toBe('https://qahub.example.com/api/bts/rules');
    expect(토큰해시(config.headers['X-QAHub-Token']!)).toBe(행.rule_token_hash);
    expect(config.body).not.toContain('prTitle');

    expect(칸들.b1).toHaveLength(1);
    expect(칸들.b2).toHaveLength(2);
    expect(부른것.find((it) => it.경로 === '/api/v1/boards/b2/columns')?.몸).toEqual({ name: 'QA Review', stateKeys: ['qa-review'] });
  });

  it('다시 누르면 웹훅은 version 을 실어 고치고 규칙은 PATCH 로 고친다 — 새로 만들지 않는다', async () => {
    const res = await 누르기();
    expect(res.json().items.every((it: { ok: boolean }) => it.ok)).toBe(true);
    expect(부른것.filter((it) => it.method === 'POST' && !it.경로.includes('/columns'))).toEqual([]);
    expect(부른것.find((it) => it.method === 'PUT')).toMatchObject({ 경로: '/api/v1/webhooks/w1', 몸: { version: 0 } });
    expect(부른것.filter((it) => it.method === 'PATCH')).toHaveLength(2);
    expect(웹훅들).toHaveLength(1);
    expect(규칙).toHaveLength(2);
    expect(칸들.b2).toHaveLength(2);
  });

  it('웹훅 권한이 없으면 그것만 ✕ · 규칙 목록을 못 읽으면 규칙 토큰을 안 바꾼다', async () => {
    const p = await pool();
    const 앞토큰 = (await p.query<{ rule_token_hash: string }>('SELECT rule_token_hash FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0]!.rule_token_hash;
    웹훅답 = 403;
    규칙답 = 403;
    const items = (await 누르기()).json().items;
    expect(items).toEqual([
      { what: 'WEBHOOK', ok: false, status: 403 },
      { what: 'RULE_ASSIGNEE', ok: false, status: 403 },
      { what: 'RULE_PR', ok: false, status: 403 },
      { what: 'BOARD', ok: true },
    ]);
    expect((await p.query<{ rule_token_hash: string }>('SELECT rule_token_hash FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0]!.rule_token_hash).toBe(앞토큰);
  });

  it('기본은 누른 계정의 auth_sub 로 받은 대신 PAT 로 부른다 — 안 묶였거나 · 꺼졌거나 · Auth 가 안 주면 NO_PERSONAL_TOKEN', async () => {
    const 누르기2 = (누가: string) => {
      누른사람 = 누가;
      return 기본앱.inject({ method: 'POST', url: `/api/settings/projects/${프로젝트}/bts/setup` });
    };
    vi.mocked(대신PAT).mockClear();
    const 됨 = await 누르기2('xbj-linked');
    expect(됨.statusCode).toBe(200);
    expect(vi.mocked(대신PAT).mock.calls.map(([누구]) => 누구)).toEqual([{ userId: 'xbj-sub-linked' }]);
    expect(new Set(부른것.map((it) => it.열쇠))).toEqual(new Set(['pat_xbj-sub-linked']));

    부른것 = [];
    vi.mocked(대신PAT).mockClear();
    for (const 누가 of ['xbj-local', 'xbj-off', 'xbj-down', 'xbj-없는계정']) {
      const res = await 누르기2(누가);
      expect([res.statusCode, res.json().error], 누가).toEqual([400, 'NO_PERSONAL_TOKEN']);
    }
    expect(vi.mocked(대신PAT).mock.calls.map(([누구]) => 누구)).toEqual([{ userId: 'xbj-sub-down' }]);
    expect(부른것).toEqual([]);
  });
});
