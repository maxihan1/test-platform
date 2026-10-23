// 시작과 중단이 엇갈릴 때 — 부하 · 페이지 실행이 막 시작될 때 중단해도 부하 발생 에이전트를 놓고, 기기 실행이 막 시작될 때 중단해도 기록기를 닫고 폰을 놓는다

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { 차림 } from './dbFixture.js';
import { type 기기차림타입, 기기차림, 쉼 } from './deviceFixture.js';
import { 기기실행시작, 기기실행중인가 } from './deviceRun.js';
import { 중단하기, 한번돌기 } from './engine.js';
import { 끝내기배경, 뒷일기다리기 } from './finish.js';
import * as 표 from './store.js';

// 진짜 함수가 끝난 바로 뒤에 끼워 넣을 일 — 엇갈림을 운에 맡기지 않고 그 틈에서 일으킨다
const 끼움 = vi.hoisted(() => ({
  시작뒤: null as null | { runId: number; 일: () => Promise<void> },
  닫기뒤: null as null | { runId: number; 일: () => Promise<void> },
}));

vi.mock('./store.js', async (importOriginal) => {
  const 진짜 = await importOriginal<typeof import('./store.js')>();
  return {
    ...진짜,
    async 대기에서시작(runId: number, status?: 'SMOKE' | 'RUNNING') {
      const 바뀜 = await 진짜.대기에서시작(runId, status);
      const 끼울 = 끼움.시작뒤;
      if (바뀜 && 끼울?.runId === runId) {
        끼움.시작뒤 = null;
        await 끼울.일();
      }
      return 바뀜;
    },
  };
});

vi.mock('./deviceRun.js', async (importOriginal) => {
  const 진짜 = await importOriginal<typeof import('./deviceRun.js')>();
  return {
    ...진짜,
    async 기기닫기(runId: number) {
      const 맡음 = await 진짜.기기닫기(runId);
      const 끼울 = 끼움.닫기뒤;
      if (끼울?.runId === runId) {
        끼움.닫기뒤 = null;
        await 끼울.일();
      }
      return 맡음;
    },
  };
});

const 연결 = process.env.DATABASE_URL;
const 에이전트이름 = ['xqs-load-1', 'xqs-load-2'];

describe.skipIf(연결 === undefined)('시작과 중단이 엇갈릴 때', { timeout: 60_000 }, () => {
  let f: 기기차림타입;
  let 판: 차림;
  let 에이전트 = 0;

  const 상태 = async (runId: number) => (await 판.pool.query<{ status: string }>('SELECT status FROM perf_run WHERE id = $1', [runId])).rows[0]?.status;
  const 붙든에이전트수 = async (runId: number) =>
    Number((await 판.pool.query<{ n: string }>('SELECT count(*) AS n FROM perf_agent WHERE busy_run_id = $1', [runId])).rows[0]?.n);

  beforeAll(async () => {
    f = await 기기차림('XQS', false);
    판 = f.판;
    for (const name of 에이전트이름) {
      const r = await 판.pool.query<{ id: string }>(
        `INSERT INTO perf_agent (name, mode, token_hash, last_seen_at, created_by) VALUES ($1, 'LOAD', $1, now(), 'xqs') RETURNING id`,
        [name],
      );
      if (에이전트 === 0) 에이전트 = Number(r.rows[0]?.id);
    }
  }, 60_000);

  afterAll(async () => {
    await 뒷일기다리기();
    await 판.pool.query('DELETE FROM perf_agent WHERE name = ANY($1)', [에이전트이름]);
    await f.정리();
  }, 60_000);

  it('부하 실행이 스모크로 바뀐 바로 뒤에 중단해도 부하 발생 에이전트를 놓는다', async () => {
    const 시나리오 = await 판.시나리오만들기('XQS 엇갈림');
    const runId = await 판.실행넣기({ scenarioId: 시나리오, status: 'QUEUED' });
    await 판.pool.query(`UPDATE perf_run SET config = jsonb_set(config, '{agentIds}', $2::jsonb) WHERE id = $1`, [runId, JSON.stringify([에이전트])]);
    끼움.시작뒤 = { runId, 일: async () => void expect(await 중단하기(runId)).toBe('OK') };

    await 한번돌기();
    await 뒷일기다리기();

    expect(끼움.시작뒤).toBeNull();
    expect(await 상태(runId)).toBe('STOPPED');
    expect(await 붙든에이전트수(runId)).toBe(0);
  });

  it('페이지 실행이 시작된 바로 뒤에 중단해도 부하 발생 에이전트를 놓는다', async () => {
    const r = await 판.pool.query<{ id: string }>(
      `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, origin) VALUES ('PAGE', $1, 'qa', 'http://shop.xqs.test', $2, 'QUEUED', 'MANUAL') RETURNING id`,
      [판.서비스, JSON.stringify({
        pages: [{ url: '/', name: '메인', login: false }], device: 'desktop', network: 'NONE', loginUrl: null,
        agentIds: [], monitorIds: [], allowedHosts: ['shop.xqs.test'], durationSec: 30, targets: [],
      })],
    );
    const runId = Number(r.rows[0]?.id);
    끼움.시작뒤 = { runId, 일: async () => void expect(await 중단하기(runId)).toBe('OK') };

    await 한번돌기();
    await 뒷일기다리기();

    expect(끼움.시작뒤).toBeNull();
    expect(await 상태(runId)).toBe('STOPPED');
    expect(await 붙든에이전트수(runId)).toBe(0);
  });

  it('기기 실행을 닫는 사이에 대기열이 그 실행을 시작해도 기록기를 닫고 폰을 놓는다', async () => {
    const runId = await f.만들기({ devices: [{ serial: 'FA1', where: 'FARM' }] }, 60);
    const 놓기전 = f.홀드삭제수('FA1');
    const 읽은수 = () => f.팜.호출들.filter((h) => h.path.startsWith('/api/devices/FA1/perf?')).length;
    끼움.닫기뒤 = {
      runId,
      일: async () => {
        const run = await 표.실행하나(runId);
        await 기기실행시작(run!, 끝내기배경);
      },
    };

    expect(await 중단하기(runId)).toBe('OK');
    await 뒷일기다리기();

    expect(끼움.닫기뒤).toBeNull();
    expect(await 상태(runId)).toBe('STOPPED');
    expect(기기실행중인가(runId)).toBe(false);
    expect(f.홀드삭제수('FA1')).toBe(놓기전 + 1);
    const 닫은뒤 = 읽은수();
    await 쉼(300);
    expect(읽은수()).toBe(닫은뒤);
  });
});
