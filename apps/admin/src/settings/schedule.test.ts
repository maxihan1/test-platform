// 서비스 설정 API 에서 정기 실행 칸이 걷혔는지 — 정기 실행은 프로젝트 공통 세트로 옮겨 갔다 (도메인/정기실행 §7, SCHED-F1-04)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRP';

describe.skipIf(연결 === undefined)('설정 API — 옛 정기 실행 칸', () => {
  let app: FastifyInstance;
  let id = 0;

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix: 접두사,
        name: `${접두사} 정기 실행 검사용`,
        color: '#112233',
        projectId: await 검사프로젝트(),
        testsRepo: '',
        testsDir: 'xrp',
        envs: [{ env: 'demo', baseUrl: 'https://demo.example.com' }],
      },
    });
    id = res.json<{ id: number }>().id;
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [id]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [id]);
    await pool.query('DELETE FROM service WHERE id = $1', [id]);
    await 검사프로젝트치우기();
    await app.close();
  });

  async function 고친다(본문: Record<string, unknown>) {
    return app.inject({ method: 'PATCH', url: `/api/settings/services/${String(id)}`, payload: 본문 });
  }

  async function 내것() {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: Record<string, unknown>[] }>().items.find((s) => s.prefix === 접두사)!;
  }

  it('서비스 줄에 정기 실행 칸이 없다', async () => {
    const 줄 = await 내것();
    expect(Object.keys(줄).filter((k) => /sched/i.test(k))).toEqual([]);
  });

  it('고치기가 schedule 을 받으면 400 이다 — 켜기도 끄기도', async () => {
    for (const schedule of [{ at: '03:00', tz: 'Asia/Seoul', env: 'demo' }, null]) {
      const res = await 고친다({ schedule });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
    }
  });
});
