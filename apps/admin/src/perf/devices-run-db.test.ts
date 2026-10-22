// 기기 성능 실행 — Appium 2대 × 2회의 구간 · 회차 붙이기 · 사람의 중단 · 도중 중단의 러너 끊기 · 무소식 AGENT_LOST 를 실제 DB 와 가짜 팜 · 가짜 서버 러너로 본다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { 차림 } from './dbFixture.js';
import { type 기기차림타입, 기기차림, 쉼, type 가짜 } from './deviceFixture.js';
import { 설정 } from './deviceRun.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('기기 성능 실행', { timeout: 90_000 }, () => {
  let f: 기기차림타입;
  let 판: 차림;
  let 팜: 가짜;
  let 러너: 가짜;
  let 로컬: 가짜;
  const 측정 = (...a: Parameters<기기차림타입['측정']>) => f.측정(...a);
  const 만들기 = (...a: Parameters<기기차림타입['만들기']>) => f.만들기(...a);
  const 끝날때까지 = (runId: number) => f.끝날때까지(runId);
  const 결과 = (...a: Parameters<기기차림타입['결과']>) => f.결과(...a);
  const 홀드삭제수 = (serial: string) => f.홀드삭제수(serial);

  beforeAll(async () => {
    f = await 기기차림('XQDR', false);
    ({ 판, 팜, 러너, 로컬 } = f);
  }, 60_000);

  afterAll(async () => {
    await f.정리();
  }, 60_000);

  it('Appium 2대 × 2회 — 기기마다 케이스를 보내고 구간 · 회차를 줄에 붙인다', async () => {
    f.상태.러너지연 = 2100;
    try {
      const runId = await 만들기({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDR-001'], repeat: 2, devices: [{ serial: 'FA1', where: 'FARM' }, { serial: 'FA2', where: 'FARM' }] }, 0);
      const 끝 = await 끝날때까지(runId);
      expect(끝).toMatchObject({ status: 'DONE', verdict: 'PASS' });
      const 보냄 = 러너.호출들.filter((h) => h.path === '/execute').map((h) => h.body);
      expect(보냄.filter((b) => b.udid === 'FA1')).toHaveLength(2);
      expect(보냄.filter((b) => b.udid === 'FA2')).toHaveLength(2);
      expect(보냄[0]).toMatchObject({ runId: 0, tcId: 'XQDR-001', platform: 'android', app: '/apps/demo.apk', baseUrl: 'http://shop.xqdr.test', filePath: 'x/x.spec.ts' });
      expect('engine' in 보냄[0]!).toBe(false);
      expect(팜.호출들.filter((h) => h.method === 'POST' && h.path === '/api/devices/FA1/hold').at(-1)?.body).toMatchObject({ minutes: 120 });
      const r = await 결과(runId);
      for (const serial of ['FA1', 'FA2']) {
        const 구간 = r.segments.filter((x) => x.serial === serial);
        for (const loop of [1, 2]) {
          expect(구간.filter((x) => x.loop === loop).map((x) => x.segment)).toEqual(expect.arrayContaining(['XQDR-001 · 로그인', 'XQDR-001 · 목록']));
        }
        expect(r.loops.filter((x) => x.serial === serial).map((x) => x.loop)).toEqual([1, 2]);
        expect(r.metrics.filter((x) => x.serial === serial && x.segment !== null).length).toBeGreaterThan(0);
      }
      expect(홀드삭제수('FA2')).toBeGreaterThan(0);
    } finally {
      f.상태.러너지연 = 0;
    }
  });

  it('게임 애플리케이션이면 조작 요청에 엔진 GAME 을 싣는다', async () => {
    const 원래 = (await 판.pool.query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [판.서비스])).rows[0]!.kind;
    await 판.pool.query(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [판.서비스]);
    try {
      const 전 = 러너.호출들.length;
      const runId = await 만들기({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDR-001'], repeat: 1, devices: [{ serial: 'FA1', where: 'FARM' }] }, 0);
      await 끝날때까지(runId);
      expect(러너.호출들.slice(전).filter((h) => h.path === '/execute').map((h) => h.body.engine)).toEqual(['GAME']);
    } finally {
      await 판.pool.query('UPDATE service SET kind = $2 WHERE id = $1', [판.서비스, 원래]);
    }
  });

  it('사람이 중단하면 기록기를 닫고 폰을 놓는다 — 판정은 없다', async () => {
    const 놓기전 = 홀드삭제수('FA1');
    const res = await 측정({ devices: [{ serial: 'FA1', where: 'FARM' }, { serial: 'LC1', where: 'LOCAL' }] });
    expect(res.statusCode).toBe(201);
    const runId = res.json<{ runId: number }>().runId;
    for (let i = 0; i < 200; i++) {
      const n = (await 판.pool.query<{ n: string }>('SELECT count(DISTINCT serial) AS n FROM perf_device_metric WHERE run_id = $1', [runId])).rows[0]?.n;
      if (Number(n) === 2) break;
      await 쉼(100);
    }
    expect((await 판.사람(판.쓰기, 'POST', `/api/perf/runs/${runId}/stop`)).statusCode).toBe(202);
    const 끝 = await 끝날때까지(runId);
    expect(끝).toMatchObject({ status: 'STOPPED', verdict: null, stop_reason: 'USER', targets: null });
    expect(홀드삭제수('FA1')).toBe(놓기전 + 1);
    expect(로컬.호출들.some((h) => h.method === 'POST' && h.path === '/perf/device/lrec/stop')).toBe(true);
    expect((await 판.사람(판.쓰기, 'POST', `/api/perf/runs/${runId}/stop`)).statusCode).toBe(409);
  });

  it('Appium 도중 중단하면 보낸 케이스를 러너에서 끊고 더 보내지 않는다', async () => {
    f.상태.러너지연 = 1500;
    try {
      const 보낸수 = 러너.호출들.filter((h) => h.path === '/execute').length;
      const runId = await 만들기({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQDR-001'], repeat: 5 }, 0);
      void 끝날때까지(runId);
      for (let i = 0; i < 100 && 러너.호출들.filter((h) => h.path === '/execute').length === 보낸수; i++) await 쉼(50);
      expect((await 판.사람(판.쓰기, 'POST', `/api/perf/runs/${runId}/stop`)).statusCode).toBe(202);
      const 끝 = await 끝날때까지(runId);
      expect(끝).toMatchObject({ status: 'STOPPED', stop_reason: 'USER' });
      const 보냄 = 러너.호출들.filter((h) => h.path === '/execute').slice(보낸수);
      expect(보냄).toHaveLength(1);
      expect(러너.호출들.filter((h) => h.path === '/abort').map((h) => h.body.historyId)).toContain(보냄[0]?.body.historyId);
    } finally {
      f.상태.러너지연 = 0;
    }
  });

  it('한 기기에서 무소식이 길면 AGENT_LOST 로 멈추고 폰을 놓는다', async () => {
    설정.무소식ms = 400;
    f.줄끔.add('FA2');
    try {
      const 놓기전 = 홀드삭제수('FA2');
      const runId = await 만들기({ devices: [{ serial: 'FA2', where: 'FARM' }] }, 60);
      const 끝 = await 끝날때까지(runId);
      expect(끝).toMatchObject({ status: 'STOPPED', verdict: null, stop_reason: 'AGENT_LOST' });
      expect(홀드삭제수('FA2')).toBe(놓기전 + 1);
      const 로그 = await 판.pool.query<{ message: string }>('SELECT message FROM perf_event WHERE run_id = $1', [runId]);
      expect(로그.rows.some((x) => x.message.includes('측정값이 오지 않아'))).toBe(true);
    } finally {
      설정.무소식ms = 2500;
      f.줄끔.delete('FA2');
    }
  });
});
