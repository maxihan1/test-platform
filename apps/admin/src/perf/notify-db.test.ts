// 성능 실행 Slack 알림을 실제 DB 로 본다 — 웹훅이 없으면 안 보내고, 정기 실행은 늘, 사람이 건 실행은 성능 저하 알림을 켰을 때만 (PERF-F1-06)

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 차리기, type 차림 } from './dbFixture.js';
import { 끝내기, 뒷일기다리기 } from './finish.js';
import { 성능알림 } from './notify.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('성능 Slack 알림', { timeout: 60_000 }, () => {
  let f: 차림;
  let 켠것 = 0;
  let 끈것 = 0;
  let 기본것 = 0;
  const 보낸것: string[] = [];
  const 보내기 = async (_웹훅: string, 글: string) => {
    보낸것.push(글);
    return true;
  };
  const 숫자 = [{ sec: 0, vus: 10, requests: 100, errors: 0, ms: 200 }];

  beforeAll(async () => {
    f = await 차리기('XPKN');
    켠것 = await f.시나리오만들기('알림 켠 것', { transactions: [{ name: '목록', method: 'GET', url: '/api/items' }], run: { degradeAlert: true } });
    끈것 = await f.시나리오만들기('알림 끈 것', { transactions: [{ name: '목록', method: 'GET', url: '/api/items' }], run: { degradeAlert: false } });
    기본것 = await f.시나리오만들기('알림 칸 없는 것');
  });
  afterAll(async () => {
    await f?.정리();
  });
  afterEach(() => {
    보낸것.length = 0;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const 웹훅 = (url: string | null) => f.pool.query('UPDATE service SET slack_webhook = $2 WHERE id = $1', [f.서비스, url]);

  it('웹훅이 없으면 정기 실행이어도 보내지 않는다', async () => {
    await 웹훅(null);
    const id = await f.실행넣기({ scenarioId: 끈것, origin: 'SCHEDULED', peakVus: 10, p95: 200 });
    expect(await 성능알림(id, 보내기)).toBe(false);
    expect(보낸것).toEqual([]);
  });

  it('정기 실행은 판정과 상관없이 늘 보내고 사람이 건 실행은 성능 저하 알림을 켠 시나리오가 저하일 때만 보낸다', async () => {
    await 웹훅('https://hooks.example.test/x');
    const 정기 = await f.실행넣기({ scenarioId: 끈것, origin: 'SCHEDULED', peakVus: 10, p95: 200 });
    expect(await 성능알림(정기, 보내기)).toBe(true);
    expect(보낸것[0]).toMatch(/^\[통과\] 알림 끈 것 PRF-\d+ · 부하 테스트 · qa · 최대 동시 사용자 10명 · 95% 응답시간 0.2초/);

    보낸것.length = 0;
    const 사람저하끔 = await f.실행넣기({ scenarioId: 끈것, degraded: true });
    const 사람정상켬 = await f.실행넣기({ scenarioId: 켠것, degraded: false });
    expect(await 성능알림(사람저하끔, 보내기)).toBe(false);
    expect(await 성능알림(사람정상켬, 보내기)).toBe(false);
    expect(보낸것).toEqual([]);

    const 사람저하켬 = await f.실행넣기({ scenarioId: 켠것, degraded: true });
    expect(await 성능알림(사람저하켬, 보내기)).toBe(true);
    expect(보낸것[0]).toContain('[통과] [성능 저하] 알림 켠 것');
  });

  it('성능 저하 알림 칸이 없는 시나리오는 마법사 기본처럼 켠 것으로 본다', async () => {
    await 웹훅('https://hooks.example.test/x');
    const 저하 = await f.실행넣기({ scenarioId: 기본것, degraded: true });
    const 정상 = await f.실행넣기({ scenarioId: 기본것, degraded: false });
    expect(await 성능알림(저하, 보내기)).toBe(true);
    expect(await 성능알림(정상, 보내기)).toBe(false);
  });

  it('보내기가 실패해도 던지지 않고 로그만 남긴다', async () => {
    await 웹훅('https://hooks.example.test/x');
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const id = await f.실행넣기({ scenarioId: 끈것, origin: 'SCHEDULED' });
    expect(await 성능알림(id, async () => { throw new Error('연결 거절'); })).toBe(false);
    expect(await 성능알림(id, async () => false)).toBe(false);
    expect(오류).toHaveBeenCalledTimes(2);
  });

  it('실행이 끝쓰기에 성공하면 끝내기가 웹훅으로 JSON 한 번을 보낸다', async () => {
    await 웹훅('https://hooks.example.test/y');
    const 가짜 = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', 가짜);
    const id = await f.실행넣기({ scenarioId: 끈것, origin: 'SCHEDULED', status: 'RUNNING', verdict: null, series: 숫자 });
    await 끝내기(id, { kind: 'DONE' });
    await 뒷일기다리기();
    expect(가짜).toHaveBeenCalledTimes(1);
    const [주소, 옵션] = 가짜.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(주소).toBe('https://hooks.example.test/y');
    expect(옵션.method).toBe('POST');
    expect(JSON.parse(옵션.body)).toEqual({ text: expect.stringMatching(/^\[통과\] 알림 끈 것 PRF-/) });
  });

  it('끝내기는 Slack 이 느려도 기다리지 않고 닫힌다 — 알림은 뒤에서 나간다', async () => {
    await 웹훅('https://hooks.example.test/z');
    let 풀기: (r: Response) => void = () => undefined;
    const 가짜 = vi.fn(() => new Promise<Response>((끝) => { 풀기 = 끝; }));
    vi.stubGlobal('fetch', 가짜);
    const id = await f.실행넣기({ scenarioId: 끈것, origin: 'SCHEDULED', status: 'RUNNING', verdict: null, series: 숫자 });
    const 먼저 = await Promise.race([끝내기(id, { kind: 'DONE' }).then(() => '닫힘'), new Promise((r) => setTimeout(() => r('막힘'), 3000))]);
    expect(먼저).toBe('닫힘');
    await vi.waitFor(() => expect(가짜).toHaveBeenCalledTimes(1));
    풀기(new Response('ok'));
    await 뒷일기다리기();
    expect(가짜).toHaveBeenCalledTimes(1);
  });
});
