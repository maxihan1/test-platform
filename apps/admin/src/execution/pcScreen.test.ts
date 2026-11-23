// 윈도우 PC 화면 영상 중계 — VISION 에 보기만으로 붙기 · 조각에 길이 붙여 흘리기 · 끊기 · 자리 없는 통로 (도메인/실행 §7 「…/pc-screen」)

import { EventEmitter } from 'node:events';

import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PC화면경로, PC화면을건넨다, PC화면을단다, 길이를붙인다, 화면소켓을연다, 화면통로주소, type 화면소켓 } from './pcScreen.js';

class 가짜소켓 implements 화면소켓 {
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  보낸것: string[] = [];
  닫힘 = false;
  send(글: string): void {
    this.보낸것.push(글);
  }
  close(): void {
    this.닫힘 = true;
  }
}

function 가짜응답() {
  const raw = Object.assign(new EventEmitter(), {
    머리: undefined as { status: number; headers: Record<string, string> } | undefined,
    쓴것: [] as Buffer[],
    끝남: false,
    writableLength: 0,
    writeHead(status: number, headers: Record<string, string>) {
      raw.머리 = { status, headers };
    },
    write(b: Buffer) {
      raw.쓴것.push(b);
      return true;
    },
    end() {
      raw.끝남 = true;
    },
  });
  const reply = { raw, hijack: vi.fn(), 상태: 0, 보낸것: undefined as unknown, code(s: number) { reply.상태 = s; return reply; }, send(b: unknown) { reply.보낸것 = b; return reply; } };
  return reply;
}

function 소켓을끼운다() {
  const 소켓 = new 가짜소켓();
  const 주소들: string[] = [];
  vi.spyOn(화면소켓을연다, '연다').mockImplementation((주소) => {
    주소들.push(주소);
    return 소켓;
  });
  return { 소켓, 주소들 };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('길이를붙인다 · 화면통로주소', () => {
  it('조각 앞에 4바이트 빅엔디언 길이를 붙인다', () => {
    expect([...길이를붙인다(new Uint8Array([7, 8, 9]))]).toEqual([0, 0, 0, 3, 7, 8, 9]);
  });

  it('http 는 ws, https 는 wss 로 바꾸고 기기 번호를 주소에 맞게 싼다', () => {
    expect(화면통로주소('http://farm.test', 'pc-pc1')).toBe('ws://farm.test/api/devices/pc-pc1/screen');
    expect(화면통로주소('https://farm.test', 'pc 1')).toBe('wss://farm.test/api/devices/pc%201/screen');
  });
});

describe('PC화면을건넨다', () => {
  it('잡은 토큰으로 보기만 붙고 영상 조각만 길이를 붙여 흘린다', () => {
    const { 소켓, 주소들 } = 소켓을끼운다();
    const reply = 가짜응답();
    PC화면을건넨다(reply as never, { serial: 'pc-pc1', 토큰: 'pat_사람' }, 'https://farm.test');

    expect(reply.hijack).toHaveBeenCalled();
    expect(reply.raw.머리).toEqual({ status: 200, headers: expect.objectContaining({ 'content-type': 'application/octet-stream', 'cache-control': 'no-store' }) });
    expect(주소들).toEqual(['wss://farm.test/api/devices/pc-pc1/screen']);
    expect(소켓.binaryType).toBe('arraybuffer');

    소켓.onopen?.();
    expect(소켓.보낸것.map((글) => JSON.parse(글))).toEqual([{ token: 'pat_사람', peek: true }]);

    소켓.onmessage?.({ data: JSON.stringify({ ready: true }) });
    소켓.onmessage?.({ data: new Uint8Array([1, 2]).buffer });
    expect(reply.raw.쓴것.map((b) => [...b])).toEqual([[0, 0, 0, 2, 1, 2]]);
  });

  it('잡은 토큰이 없으면 DEVICE_FARM_TOKEN 으로 붙는다', () => {
    vi.stubEnv('DEVICE_FARM_TOKEN', 'farm-토큰');
    const { 소켓 } = 소켓을끼운다();
    PC화면을건넨다(가짜응답() as never, { serial: 'pc-pc1', 토큰: undefined }, 'http://farm.test');
    소켓.onopen?.();
    expect(JSON.parse(소켓.보낸것[0]!)).toEqual({ token: 'farm-토큰', peek: true });
  });

  it('VISION 이 닫으면 응답을 끝내고, 그 뒤 온 조각은 버린다', () => {
    const { 소켓 } = 소켓을끼운다();
    const reply = 가짜응답();
    PC화면을건넨다(reply as never, { serial: 'pc-pc1', 토큰: 't' }, 'http://farm.test');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    소켓.onclose?.({ code: 4403, reason: '다른 사용자가 쓰는 중' });
    소켓.onmessage?.({ data: new Uint8Array([1]).buffer });
    expect(reply.raw.끝남).toBe(true);
    expect(reply.raw.쓴것).toEqual([]);
  });

  it('브라우저가 떠나면 VISION 연결을 닫는다', () => {
    const { 소켓 } = 소켓을끼운다();
    const reply = 가짜응답();
    PC화면을건넨다(reply as never, { serial: 'pc-pc1', 토큰: 't' }, 'http://farm.test');
    reply.raw.emit('close');
    expect(소켓.닫힘).toBe(true);
  });

  it('브라우저가 밀려 쌓이면 끊는다 — 다시 붙으면 키프레임부터 받는다', () => {
    const { 소켓 } = 소켓을끼운다();
    const reply = 가짜응답();
    PC화면을건넨다(reply as never, { serial: 'pc-pc1', 토큰: 't' }, 'http://farm.test');
    reply.raw.writableLength = 5 * 1024 * 1024;
    소켓.onmessage?.({ data: new Uint8Array([1]).buffer });
    expect(reply.raw.쓴것).toEqual([]);
    expect(소켓.닫힘).toBe(true);
    expect(reply.raw.끝남).toBe(true);
  });

  it('팜 주소가 없으면 붙지 않고 404 FARM_OFF', () => {
    const 연다 = vi.spyOn(화면소켓을연다, '연다');
    const reply = 가짜응답();
    PC화면을건넨다(reply as never, { serial: 'pc-pc1', 토큰: 't' }, undefined);
    expect(reply.상태).toBe(404);
    expect(reply.보낸것).toEqual(expect.objectContaining({ error: 'FARM_OFF' }));
    expect(연다).not.toHaveBeenCalled();
  });
});

describe('PC화면경로', () => {
  async function 앱() {
    const app = Fastify();
    await app.register(PC화면경로);
    return app;
  }

  it('PC 를 안 잡은 정식 실행 항목은 404 LIVE_NOT_FOUND', async () => {
    const app = await 앱();
    const res = await app.inject({ method: 'GET', url: '/runs/1/items/77/pc-screen' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual(expect.objectContaining({ error: 'LIVE_NOT_FOUND' }));
    await app.close();
  });

  it('번호가 숫자가 아니면 400', async () => {
    const app = await 앱();
    expect((await app.inject({ method: 'GET', url: '/runs/x/items/77/pc-screen' })).statusCode).toBe(400);
    await app.close();
  });

  it('자리가 있어도 내 시험이 아니면 404 TRIAL_NOT_FOUND — 남의 trialId 로 화면을 못 본다', async () => {
    PC화면을단다('trial:남의-시험', { serial: 'pc-pc1', 토큰: 't' });
    const 연다 = vi.spyOn(화면소켓을연다, '연다');
    const app = await 앱();
    const res = await app.inject({ method: 'GET', url: '/cases/BRP-FN-001/test-run/남의-시험/pc-screen' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual(expect.objectContaining({ error: 'TRIAL_NOT_FOUND' }));
    expect(연다).not.toHaveBeenCalled();
    PC화면을단다('trial:남의-시험', undefined);
    await app.close();
  });
});
