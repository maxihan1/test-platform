// 설정 API 의 준비 주소 칸 — 저장 · 끝 4자리 · 이어받기 · 거절 코드 (도메인/인증 §7 envs[] prep · SEED-F1-02). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XEP';
const 값 = 'seed-prep-secret-xep-4321';
const 주소 = 'http://127.0.0.1:5090/prep';

type 준비응답 = { url: string; header: string; valueLast4: string; timeoutSec: number } | null;
type 서비스응답 = { prefix: string; envs: { env: string; isProd: boolean; prep: 준비응답 }[] };

describe.skipIf(연결 === undefined)('설정 API 의 테스트 데이터 준비 칸 (도메인/인증 §7 envs[] prep · SEED-F1-02)', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
  let 번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 치운다(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = $1)', [접두사]);
    await p.query('DELETE FROM service WHERE prefix = $1', [접두사]);
    await 검사프로젝트치우기();
  }

  const 만든다 = async (envs: unknown[]) =>
    app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: { prefix: 접두사, kind: 'SCREEN', name: 'XEP 준비', color: '#112233', projectId: await 검사프로젝트(), testsRepo: '', testsDir: 'xep', envs },
    });
  const 고친다 = async (envs: unknown[]) => app.inject({ method: 'PATCH', url: `/api/settings/services/${String(번호)}`, payload: { envs } });
  async function 읽는다(): Promise<서비스응답 | undefined> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    expect(res.body).not.toContain(값);
    return res.json<{ items: 서비스응답[] }>().items.find((s) => s.prefix === 접두사);
  }
  async function 저장된준비(): Promise<unknown> {
    const r = await (await pool()).query<{ prep: unknown }>('SELECT prep FROM service_env WHERE service_id = $1', [번호]);
    return r.rows[0]?.prep;
  }
  const 줄 = (prep?: unknown, 더 = {}) => ({ env: 'qa', baseUrl: 'http://127.0.0.1:5080', ...(prep === undefined ? {} : { prep }), ...더 });
  const 원문 = { url: 주소, header: 'X-Prep-Key', value: 값, timeoutSec: 120 };

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
    const res = await 만든다([줄({ url: 주소, header: 'X-Prep-Key', value: 값 })]);
    expect(res.statusCode).toBe(201);
    번호 = res.json<{ id: number }>().id;
  }, 60_000);

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  }, 60_000);

  beforeEach(async () => {
    expect((await 고친다([줄({ url: 주소, header: 'X-Prep-Key', value: 값 }, { isProd: false })])).statusCode).toBe(200);
  }, 30_000);

  it('웹 애플리케이션도 받고, 응답은 주소 · 머리 · 값 끝 4자리 · 시간 한도만 싣는다', async () => {
    expect((await 읽는다())?.envs[0]?.prep).toEqual({ url: 주소, header: 'X-Prep-Key', valueLast4: '4321', timeoutSec: 120 });
    expect(await 저장된준비()).toEqual(원문);
  });

  it('키를 안 보내거나 값 없이 같은 주소 · 머리를 보내면 옛 값을 잇고, null 이면 지운다', async () => {
    expect((await 고친다([줄()])).statusCode).toBe(200);
    expect(await 저장된준비()).toEqual(원문);
    expect((await 고친다([줄({ url: ` ${주소} `, header: 'X-Prep-Key', timeoutSec: 300 })])).statusCode).toBe(200);
    expect(await 저장된준비()).toEqual({ ...원문, timeoutSec: 300 });
    expect((await 고친다([줄(null)])).statusCode).toBe(200);
    expect(await 저장된준비()).toBeNull();
    expect((await 읽는다())?.envs[0]?.prep).toBeNull();
  });

  it('주소 · 머리 · 대상 서버 이름을 바꾸면서 값을 안 보내면 400 PREP_VALUE_REQUIRED 이고 옛 값은 그대로다', async () => {
    for (const 본문 of [
      줄({ url: 'http://127.0.0.1:5091/prep', header: 'X-Prep-Key' }),
      줄({ url: 주소, header: 'X-Other-Key' }),
      { ...줄({ url: 주소, header: 'X-Prep-Key' }), env: 'stage' },
    ]) {
      const res = await 고친다([본문]);
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'PREP_VALUE_REQUIRED' }]);
    }
    expect(await 저장된준비()).toEqual(원문);
  });

  it('칸 규칙을 어기면 400 BAD_PREP 이다', async () => {
    for (const 준비 of [
      { url: 'file:///etc/passwd', header: 'X-Prep-Key', value: 값 },
      { url: 주소, header: 'X Prep', value: 값 },
      { url: 주소, header: 'X-Prep-Key', value: 'short' },
      { url: 주소, header: 'X-Prep-Key', value: 값, timeoutSec: 601 },
    ]) {
      const res = await 고친다([줄(준비)]);
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_PREP' }]);
    }
    expect(await 저장된준비()).toEqual(원문);
  });

  it('실서비스 서버 줄에 준비가 남으면 400 PREP_ON_PROD 이고, null 과 같이 보내면 받는다', async () => {
    for (const 본문 of [줄(undefined, { isProd: true }), 줄({ url: 주소, header: 'X-Prep-Key', value: 값 }, { isProd: true })]) {
      const res = await 고친다([본문]);
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'PREP_ON_PROD' }]);
    }
    expect(await 저장된준비()).toEqual(원문);
    expect((await 고친다([줄(null, { isProd: true })])).statusCode).toBe(200);
    expect((await 읽는다())?.envs[0]).toMatchObject({ isProd: true, prep: null });
  });
});
