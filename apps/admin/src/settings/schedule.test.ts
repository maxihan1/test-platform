// 서비스 설정의 정기 실행 칸 — 저장 규칙과 「마지막 정기 실행」 (SPEC 도메인/인증 §7 「정기 실행」 계약 변경 블록)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRP';

describe.skipIf(연결 === undefined)('설정 API — 정기 실행', () => {
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

  it('새 서비스는 꺼져 있고 마지막 정기 실행도 없다', async () => {
    expect(await 내것()).toMatchObject({ schedule: null, lastScheduled: null });
  });

  it('켜면 시각 · 시간대 · 대상 서버를 그대로 돌려준다', async () => {
    const res = await 고친다({ schedule: { at: '03:00', tz: 'Asia/Seoul', env: 'demo' } });
    expect(res.statusCode).toBe(200);
    expect((await 내것()).schedule).toEqual({ at: '03:00', tz: 'Asia/Seoul', env: 'demo' });
  });

  it('schedule 을 안 보내면 그대로 둔다', async () => {
    await 고친다({ name: `${접두사} 이름만 고침` });
    expect((await 내것()).schedule).toEqual({ at: '03:00', tz: 'Asia/Seoul', env: 'demo' });
  });

  it('틀린 시각 · 시간대 · 대상 서버는 400 이고 어느 칸인지 짚는다', async () => {
    const 시각 = await 고친다({ schedule: { at: '24:00', tz: 'Asia/Seoul', env: 'demo' } });
    expect(시각.statusCode).toBe(400);

    const 시간대 = await 고친다({ schedule: { at: '03:00', tz: 'Mars/Base', env: 'demo' } });
    expect(시간대.json()).toEqual({ error: 'INVALID_REQUEST', detail: 'schedule.tz: Mars/Base' });

    const 서버 = await 고친다({ schedule: { at: '03:00', tz: 'Asia/Seoul', env: 'prod' } });
    expect(서버.json()).toEqual({ error: 'INVALID_REQUEST', detail: 'schedule.env: prod' });

    expect((await 내것()).schedule).toEqual({ at: '03:00', tz: 'Asia/Seoul', env: 'demo' });
  });

  it('같이 보낸 대상 서버 목록으로 대상 서버를 본다', async () => {
    const 뺐다 = await 고친다({
      envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
      schedule: { at: '03:00', tz: 'Asia/Seoul', env: 'demo' },
    });
    expect(뺐다.json()).toEqual({ error: 'INVALID_REQUEST', detail: 'schedule.env: demo' });

    const 더했다 = await 고친다({
      envs: [{ env: 'demo', baseUrl: 'https://demo.example.com' }, { env: 'qa', baseUrl: 'https://qa.example.com' }],
      schedule: { at: '04:30', tz: 'Asia/Seoul', env: 'qa' },
    });
    expect(더했다.statusCode).toBe(200);
    expect((await 내것()).schedule).toEqual({ at: '04:30', tz: 'Asia/Seoul', env: 'qa' });
  });

  it('envs 만 보내 켜 둔 정기 실행의 대상 서버를 빼도 400 이다', async () => {
    const res = await 고친다({ envs: [{ env: 'demo', baseUrl: 'https://demo.example.com' }] });
    expect(res.json()).toEqual({ error: 'INVALID_REQUEST', detail: 'schedule.env: qa' });
  });

  it('마지막 정기 실행은 마지막으로 돈 때 뒤에 스케줄러가 만든 실행만 번호 순으로 싣는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query("UPDATE service SET schedule_last = '2026-10-12T18:00:00Z' WHERE id = $1", [id]);
    const 실행 = async (누가: string, 언제: string) =>
      Number(
        (
          await pool.query<{ run_id: string }>(
            `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status, started_at, kind)
                  VALUES ('XRP 실행', $1, 'XRP', '', $2, 'demo', 'https://demo.example.com', 'FINISHED', $3, 'UI') RETURNING run_id`,
            [id, 누가, 언제],
          )
        ).rows[0]!.run_id,
      );
    await 실행('스케줄러', '2026-10-11T18:00:00Z');
    const 기능 = await 실행('스케줄러', '2026-10-12T18:00:02Z');
    await 실행('admin', '2026-10-12T18:05:00Z');
    const ui = await 실행('스케줄러', '2026-10-12T18:00:01Z');

    expect((await 내것()).lastScheduled).toEqual({ at: '2026-10-12T18:00:00.000Z', runIds: [기능, ui].sort((a, b) => a - b) });
  });

  it('끄면 시각 · 대상 서버는 지우고 마지막 정기 실행은 남긴다', async () => {
    const res = await 고친다({ schedule: null });
    expect(res.statusCode).toBe(200);
    const 하나 = await 내것();
    expect(하나.schedule).toBeNull();
    expect(하나.lastScheduled).not.toBeNull();

    // 꺼 두면 대상 서버 줄을 마음대로 고친다
    const 뺐다 = await 고친다({ envs: [{ env: 'demo', baseUrl: 'https://demo.example.com' }] });
    expect(뺐다.statusCode).toBe(200);
  });
});
