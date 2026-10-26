// 기기 성능 — 측정 거절 · 고를 수 있는 기기 · 팜 폰 직접 플레이와 판정 · 결과 읽기 · 녹화 화면 · 기기 추천을 실제 DB 와 가짜 팜 · 가짜 내 컴퓨터 러너로 본다

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 분석결과쓰기 } from './analysis.js';
import type { 차림 } from './dbFixture.js';
import { type 기기차림타입, 기기차림, 환경로, type 가짜 } from './deviceFixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('기기 성능', { timeout: 90_000 }, () => {
  let f: 기기차림타입;
  let 판: 차림;
  let 팜: 가짜;
  let 임시 = '';
  let API앱 = 0;
  const 측정 = (...a: Parameters<기기차림타입['측정']>) => f.측정(...a);
  const 만들기 = (...a: Parameters<기기차림타입['만들기']>) => f.만들기(...a);
  const 끝날때까지 = (runId: number) => f.끝날때까지(runId);
  const 결과 = (...a: Parameters<기기차림타입['결과']>) => f.결과(...a);
  const 홀드삭제수 = (serial: string) => f.홀드삭제수(serial);

  beforeAll(async () => {
    f = await 기기차림('XQD', true);
    ({ 판, 팜, 임시, API앱 } = f);
  }, 60_000);

  afterAll(async () => {
    await f.정리();
  }, 60_000);

  it('애플리케이션 종류 · 조작 방식 · 팜 · 내 컴퓨터 러너 · 앱 파일 · 남의 케이스를 거절한다', async () => {
    expect((await 측정({ serviceId: API앱 })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: 'API 애플리케이션은 기기 성능을 잴 수 없습니다' });
    expect((await 측정({ drive: 'ALTTESTER', durationSec: undefined, caseIds: ['XQD-001'] })).statusCode).toBe(400);
    expect((await 측정({ drive: 'GAME', durationSec: undefined })).statusCode).toBe(400);
    expect((await 측정({ drive: 'GAME', durationSec: undefined, caseIds: ['XQD-001'] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '게임 케이스는 게임 애플리케이션만 고릅니다' });
    await 환경로({ DEVICE_FARM_URL: undefined }, async () => {
      const r = await 측정();
      expect(r.statusCode).toBe(409);
      expect(r.json()).toMatchObject({ error: 'FARM_OFF' });
    });
    await 환경로({ LOCAL_RUNNER_URL: undefined }, async () => {
      expect((await 측정({ devices: [{ serial: 'LC1', where: 'LOCAL' }] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: expect.stringContaining('LOCAL_RUNNER_URL') });
    });
    const 앱 = (more: object) => 측정({ drive: 'APPIUM', durationSec: undefined, caseIds: ['XQD-001'], ...more });
    expect((await 앱({ env: 'dev' })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '대상 서버 줄에 앱 파일이 없습니다' });
    expect((await 앱({ caseIds: ['XQDB-001'] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '이 애플리케이션의 케이스가 아닙니다: XQDB-001' });
    expect((await 앱({ caseIds: ['XQD-002'] })).json()).toMatchObject({ detail: 'Android 앱 케이스가 아닙니다: XQD-002' });
    expect((await 앱({ devices: [{ serial: 'LC1', where: 'LOCAL' }] })).json()).toMatchObject({ detail: 'Appium 케이스는 팜 폰만 잴 수 있습니다' });
    expect((await 앱({ devices: [{ serial: 'FA1', where: 'FARM' }, { serial: 'FA1', where: 'FARM' }] })).statusCode).toBe(400);
    const 원래 = (await 판.pool.query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [판.서비스])).rows[0]!.kind;
    await 판.pool.query(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [판.서비스]);
    try {
      expect((await 앱({})).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '게임 애플리케이션은 게임 케이스로 잽니다' });
      expect((await 앱({ drive: 'GAME', devices: [{ serial: 'LC1', where: 'LOCAL' }] })).json()).toMatchObject({ detail: '게임 케이스는 팜 폰만 잴 수 있습니다' });
      expect((await 앱({ drive: 'GAME', env: 'dev' })).json()).toMatchObject({ detail: '대상 서버 줄에 앱 파일이 없습니다' });
    } finally {
      await 판.pool.query('UPDATE service SET kind = $2 WHERE id = $1', [판.서비스, 원래]);
    }
    expect((await 측정({ repeat: 2 })).statusCode).toBe(400);
    expect((await 측정({ targets: [{ metric: 'AVG_FPS', op: '<=', value: 50, source: 'MANUAL' }] })).statusCode).toBe(400);
    expect((await 측정({}, 판.읽기만)).statusCode).toBe(403);
  });

  it('고를 수 있는 기기는 팜 폰과 내 컴퓨터 러너 폰을 합치고 한쪽이 닿지 않으면 그쪽만 비운다', async () => {
    const 목록 = async () => (await 판.사람(판.읽기만, 'GET', `/api/perf/devices?serviceId=${판.서비스}`)).json<{ devices: object[] }>().devices;
    expect(await 목록()).toEqual([
      { serial: 'FA1', model: 'SM-A236', os: '13', where: 'FARM', status: 'IDLE' },
      { serial: 'FA2', model: 'Pixel 6', os: '14', where: 'FARM', status: 'IDLE' },
      { serial: 'FB1', model: 'Galaxy S9', os: '10', where: 'FARM', status: 'BUSY' },
      { serial: 'LC1', model: 'Pixel 7', os: '14', where: 'LOCAL', status: 'IDLE' },
    ]);
    await 환경로({ DEVICE_FARM_URL: 'http://127.0.0.1:1' }, async () => {
      expect(await 목록()).toEqual([{ serial: 'LC1', model: 'Pixel 7', os: '14', where: 'LOCAL', status: 'IDLE' }]);
    });
  });

  let 직접플레이: number;
  let 영상이름 = '';

  it('팜 폰 직접 플레이 — 줄을 받아 DONE 이 되고 목표대로 판정하며 녹화 · 앱 실행 시간을 남기고 폰을 놓는다', async () => {
    직접플레이 = await 만들기({ targets: [{ metric: 'AVG_FPS', op: '>=', value: 50, source: 'AI' }, { metric: 'MAX_TEMP', op: '<=', value: 45, source: 'MANUAL' }, { metric: 'LAUNCH_MS', op: '<=', value: 3000, source: 'MANUAL' }] }, 2);
    const 끝 = await 끝날때까지(직접플레이);
    expect(끝).toMatchObject({ status: 'DONE', verdict: 'PASS', stop_reason: null });
    expect(끝.targets?.map((t) => [t.metric, t.scope, t.measured, t.verdict])).toEqual([['AVG_FPS', 'FA1', 58, 'PASS'], ['MAX_TEMP', 'FA1', 38, 'PASS'], ['LAUNCH_MS', 'FA1', 2300, 'PASS']]);
    expect(끝.config.devices[0]?.launchMs).toBe(2300);
    const 잡기 = 팜.호출들.filter((h) => h.method === 'POST' && h.path === '/api/devices/FA1/hold').at(-1)!;
    expect(잡기.body).toEqual({ minutes: 30, perf: { package: 'com.demo.market', intervalSec: 1, record: true } });
    expect(홀드삭제수('FA1')).toBeGreaterThan(0);
    const 파일 = await readdir(join(임시, 'perf', String(직접플레이), 'FA1'));
    expect(파일).toHaveLength(1);
    expect(파일[0]).toMatch(/^rec-\d+\.mp4$/);
    영상이름 = 파일[0] ?? '';
    const 일 = await 판.pool.query<{ input: { kind: string; devices: { serial: string; firstSec: number; lastSec: number; verdict: string }[] } }>(`SELECT input FROM perf_ai_job WHERE run_id = $1 AND kind = 'ANALYZE_RUN'`, [직접플레이]);
    expect(일.rows[0]?.input.kind).toBe('DEVICE');
    expect(일.rows[0]?.input.devices[0]).toMatchObject({ serial: 'FA1', verdict: 'PASS' });
  });

  it('결과 읽기 — 기기 · 줄 · 영상 · 표시를 주고 from 뒤의 줄만 준다. PDF 는 없다', async () => {
    const r = await 결과(직접플레이);
    expect(r.devices).toMatchObject([{ serial: 'FA1', model: 'SM-A236', where: 'FARM', launchMs: 2300, summary: { avgFps: 58, maxTempC: 38 }, verdict: 'PASS' }]);
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.metrics[0]).toMatchObject({ serial: 'FA1', sec: expect.any(Number), loop: null, segment: null, fps: 58 });
    expect(r.segments).toEqual([]);
    expect(r.leak).toEqual([]);
    expect(r.videos).toEqual([{ serial: 'FA1', name: 영상이름, startSec: Number(/\d+/.exec(영상이름)?.[0]) }]);
    expect(r.markers).toEqual([]);
    expect((await 결과(직접플레이, '?from=1000')).metrics).toEqual([]);
    await 분석결과쓰기(직접플레이, { title: '제목', items: ['항목'], markers: [{ serial: 'FA1', sec: 1, label: 'FPS 급락' }] });
    expect((await 결과(직접플레이)).markers).toEqual([{ serial: 'FA1', sec: 1, label: 'FPS 급락' }]);
    expect((await 판.사람(판.관리자, 'GET', `/api/perf/runs/${직접플레이}/report.pdf`)).statusCode).toBe(400);
    const 부하 = await 판.실행넣기({ scenarioId: await 판.시나리오만들기('부하') });
    expect((await 판.사람(판.관리자, 'GET', `/api/perf/runs/${부하}/devices`)).statusCode).toBe(404);
  });

  it('녹화 화면 — 꼴이 틀리면 400, 없으면 404, 있으면 내주고 Range 를 받는다', async () => {
    const 영상 = (경로: string, headers: Record<string, string> = {}) => 판.app.inject({ method: 'GET', url: `/api/perf/runs/${직접플레이}/videos/${경로}`, headers: { cookie: 판.읽기만, ...headers } });
    expect((await 영상('a%20b/rec-0.mp4')).statusCode).toBe(400);
    expect((await 영상('FA1/x.mp4')).statusCode).toBe(400);
    expect((await 영상('FA1/rec-0.mp4.exe')).statusCode).toBe(400);
    expect((await 영상('FA1/rec-9.mp4')).statusCode).toBe(404);
    expect((await 영상(`FA2/${영상이름}`)).statusCode).toBe(404);
    const 전체 = await 영상(`FA1/${영상이름}`);
    expect(전체.statusCode).toBe(200);
    expect(전체.body).toBe('FAKEMP4!');
    const 조각 = await 영상(`FA1/${영상이름}`, { range: 'bytes=0-3' });
    expect(조각.statusCode).toBe(206);
    expect(조각.body).toBe('FAKE');
    expect(조각.headers['content-range']).toBe('bytes 0-3/8');
  });

  it('목표를 벗어나면 실패다 — 실행은 DONE 이다', async () => {
    f.상태.fps값 = 30;
    try {
      const 끝 = await 끝날때까지(await 만들기({ targets: [{ metric: 'AVG_FPS', op: '>=', value: 50, source: 'AI' }, { metric: 'LOW1_FPS', op: '>=', value: 25, source: 'AI' }] }, 1));
      expect(끝).toMatchObject({ status: 'DONE', verdict: 'FAIL' });
      expect(끝.targets?.map((t) => [t.metric, t.measured, t.verdict])).toEqual([['AVG_FPS', 30, 'FAIL'], ['LOW1_FPS', 30, 'PASS']]);
    } finally {
      f.상태.fps값 = 58;
    }
  });

  it('숫자를 한 줄도 안 보낸 기기는 목표가 없어도 실패다', async () => {
    f.줄끔.add('FA2');
    try {
      const runId = await 만들기({ devices: [{ serial: 'FA1', where: 'FARM' }, { serial: 'FA2', where: 'FARM' }], targets: [] }, 1);
      expect(await 끝날때까지(runId)).toMatchObject({ status: 'DONE', verdict: 'FAIL' });
      const 몸 = await 결과(runId);
      expect(몸.devices.map((d) => [d.serial, d.verdict])).toEqual([['FA1', 'PASS'], ['FA2', 'FAIL']]);
    } finally {
      f.줄끔.delete('FA2');
    }
  });

  it('기기 추천은 팜 기기 목록을 재료로 하고 팜이 꺼졌으면 409', async () => {
    const res = await 판.사람(판.쓰기, 'POST', '/api/perf/suggest', { serviceId: 판.서비스, kind: 'DEVICES' });
    expect(res.statusCode).toBe(202);
    const 일 = await 판.pool.query<{ kind: string; input: { devices: { serial: string; model: string; osVersion: string; resolution: string }[] } }>('SELECT kind, input FROM perf_ai_job WHERE id = $1', [res.json<{ jobId: number }>().jobId]);
    expect(일.rows[0]?.kind).toBe('SUGGEST_DEVICES');
    expect(일.rows[0]?.input.devices.map((d) => d.serial)).toEqual(['FA1', 'FA2', 'FB1']);
    expect(일.rows[0]?.input.devices[0]).toEqual({ serial: 'FA1', model: 'SM-A236', osVersion: '13', resolution: '1080x2408' });
    await 환경로({ DEVICE_FARM_URL: undefined }, async () => {
      expect((await 판.사람(판.쓰기, 'POST', '/api/perf/suggest', { serviceId: 판.서비스, kind: 'DEVICES' })).json()).toMatchObject({ error: 'NO_DATA' });
    });
  });
});
