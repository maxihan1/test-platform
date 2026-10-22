// 설정 API 의 게임 애플리케이션 칸 — 종류 GAME · 대상 서버 줄의 어드민 키 저장 · 끝 4자리 · 이어받기 · 거절 코드
// (도메인/게임 §3.10 「케이스 꼴」 · GAME-F1-07). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGM';
const 화면접두사 = 'XGMS';
const 키값 = 'ashveil-admin-key-xgm-9876';

type 서비스응답 = { prefix: string; kind: string; envs: { env: string; adminKey: { header: string; valueLast4: string } | null }[] };

describe.skipIf(연결 === undefined)('설정 API 의 게임 애플리케이션 칸', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
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
      payload: { name: 'XGM 게임', color: '#112233', projectId: await 검사프로젝트(), testsRepo: '', testsDir: 'xgm', ...본문 },
    });
  const 고친다 = async (본문: Record<string, unknown>) =>
    app.inject({ method: 'PATCH', url: `/api/settings/services/${String(번호)}`, payload: 본문 });
  async function 읽는다(prefix = 접두사): Promise<서비스응답 | undefined> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    expect(res.body).not.toContain(키값);
    return res.json<{ items: 서비스응답[] }>().items.find((s) => s.prefix === prefix);
  }
  async function 저장된키(): Promise<unknown> {
    const r = await (await pool()).query<{ admin_key: unknown }>('SELECT admin_key FROM service_env WHERE service_id = $1', [번호]);
    return r.rows[0]?.admin_key;
  }
  const 줄 = (adminKey?: unknown) => ({ env: 'qa', baseUrl: 'http://127.0.0.1:5080', ...(adminKey === undefined ? {} : { adminKey }) });

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
    const res = await 만든다({ prefix: 접두사, kind: 'GAME', envs: [줄({ header: 'X-Admin-Key', value: 키값 })] });
    expect(res.statusCode).toBe(201);
    번호 = res.json<{ id: number }>().id;
  }, 60_000);

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  }, 60_000);

  beforeEach(async () => {
    expect((await 고친다({ envs: [줄({ header: 'X-Admin-Key', value: 키값 })] })).statusCode).toBe(200);
  }, 30_000);

  it('게임 애플리케이션을 만들면 종류 GAME 이 남고 어드민 키는 머리와 값 끝 4자리만 돌려준다', async () => {
    expect(await 읽는다()).toMatchObject({ kind: 'GAME', envs: [{ env: 'qa', adminKey: { header: 'X-Admin-Key', valueLast4: '9876' } }] });
    expect(await 저장된키()).toEqual({ header: 'X-Admin-Key', value: 키값 });
  });

  it('키를 안 보내거나 값 없이 같은 머리를 보내면 옛 값을 잇고, null 이면 지운다', async () => {
    expect((await 고친다({ envs: [줄()] })).statusCode).toBe(200);
    expect(await 저장된키()).toEqual({ header: 'X-Admin-Key', value: 키값 });
    expect((await 고친다({ envs: [줄({ header: ' X-Admin-Key ' })] })).statusCode).toBe(200);
    expect(await 저장된키()).toEqual({ header: 'X-Admin-Key', value: 키값 });
    expect((await 고친다({ envs: [줄(null)] })).statusCode).toBe(200);
    expect(await 저장된키()).toBeNull();
    expect((await 읽는다())?.envs[0]?.adminKey).toBeNull();
  });

  it('머리를 바꾸면서 값을 안 보내면 400 ADMIN_KEY_VALUE_REQUIRED 이고 옛 값은 그대로다', async () => {
    const res = await 고친다({ envs: [줄({ header: 'X-Other-Key' })] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'ADMIN_KEY_VALUE_REQUIRED' });
    expect(await 저장된키()).toEqual({ header: 'X-Admin-Key', value: 키값 });
  });

  it('머리 글자가 틀리거나 값이 12자보다 짧거나 머리에 못 싣는 글자(줄바꿈 · 한글)면 400 BAD_ADMIN_KEY', async () => {
    for (const 키 of [{ header: 'X Admin', value: 키값 }, { header: '', value: 키값 }, { header: 'X-Admin-Key', value: 'short-key' }, { header: 'X-Admin-Key', value: `${키값}\n` }, { header: 'X-Admin-Key', value: `${키값}한글` }]) {
      const res = await 고친다({ envs: [줄(키)] });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'BAD_ADMIN_KEY' });
    }
  });

  it('게임이 아닌 애플리케이션에 어드민 키를 보내면 400 NOT_GAME_SERVICE', async () => {
    const res = await 만든다({ prefix: 화면접두사, kind: 'SCREEN', envs: [줄({ header: 'X-Admin-Key', value: 키값 })] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'NOT_GAME_SERVICE' });
    expect(await 읽는다(화면접두사)).toBeUndefined();
  });
});
