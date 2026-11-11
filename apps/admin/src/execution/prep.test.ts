// 실행 전 준비 — 준비 주소 부르기 · 같은 열쇠 차례 · 멈추기를 가짜 준비 서버로 본다 (도메인/실행 §3.2 「실행 전 준비」)

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 준비열쇠, 준비를부른다, 차례를잡는다 } from './prep.js';

let 서버: Server;
let 주소 = '';
const 받은것: { 머리: string | undefined; 본문: string }[] = [];
let 대답: (req: IncomingMessage, res: ServerResponse) => void = (_q, res) => res.end('ok');

beforeAll(async () => {
  서버 = createServer((req, res) => {
    let 본문 = '';
    req.on('data', (c: Buffer) => (본문 += c.toString()));
    req.on('end', () => {
      받은것.push({ 머리: req.headers['x-prep-key'] as string | undefined, 본문 });
      대답(req, res);
    });
  });
  await new Promise<void>((끝) => 서버.listen(0, '127.0.0.1', 끝));
  주소 = `http://127.0.0.1:${String((서버.address() as AddressInfo).port)}/prep`;
});

afterAll(async () => {
  서버.closeAllConnections();
  await new Promise<void>((끝) => 서버.close(() => 끝()));
});

const 준비 = (덧: Partial<{ url: string; timeoutSec: number }> = {}) => ({
  url: 주소,
  header: 'X-Prep-Key',
  value: 'secret-value-1234',
  timeoutSec: 5,
  ...덧,
});
const 안끊김 = () => new AbortController().signal;

describe('준비열쇠', () => {
  it('앞뒤 공백과 끝의 / 를 떼어 같은 주소로 본다', () => {
    expect(준비열쇠(' https://x/prep/ ')).toBe(준비열쇠('https://x/prep'));
  });
});

describe('준비를부른다', () => {
  it('비밀 헤더와 본문을 실어 POST 하고 2xx 면 성공이다', async () => {
    대답 = (_q, res) => res.end('done');
    받은것.length = 0;
    const 답 = await 준비를부른다(준비(), { runId: 7, service: 'MTW', env: 'qa', origin: 'MANUAL' }, 안끊김());
    expect(답).toEqual({ ok: true });
    expect(받은것[0]).toEqual({ 머리: 'secret-value-1234', 본문: '{"runId":7,"service":"MTW","env":"qa","origin":"MANUAL"}' });
  });

  it('2xx 가 아니면 상태와 본문을 300자까지 비밀값을 가려 남긴다', async () => {
    대답 = (_q, res) => {
      res.statusCode = 500;
      res.end(`seed failed secret-value-1234 password=hunter22 ${'x'.repeat(400)}`);
    };
    const 답 = await 준비를부른다(준비(), {}, 안끊김());
    expect(답.ok).toBe(false);
    const note = 답.ok || 답.끊김 ? '' : 답.note;
    expect(note.startsWith('HTTP 500 · seed failed ')).toBe(true);
    expect(note).not.toContain('secret-value-1234');
    expect(note).not.toContain('hunter22');
    expect(note.length).toBe(300);
  });

  it('다른 곳으로 넘기는 응답은 따라가지 않고 실패다', async () => {
    대답 = (_q, res) => {
      res.statusCode = 302;
      res.setHeader('location', 'http://127.0.0.1:1/elsewhere');
      res.end();
    };
    const 답 = await 준비를부른다(준비(), {}, 안끊김());
    expect(답).toMatchObject({ ok: false, 끊김: false, note: expect.stringMatching(/^HTTP 302/) as unknown });
  });

  it('시간 한도를 넘기면 「시간 초과 N초」다', async () => {
    대답 = () => undefined;
    const 답 = await 준비를부른다(준비({ timeoutSec: 0.2 }), {}, 안끊김());
    expect(답).toEqual({ ok: false, 끊김: false, note: '시간 초과 0.2초' });
  });

  it('연결이 안 되면 연결 오류 글이다', async () => {
    const 답 = await 준비를부른다(준비({ url: 'http://127.0.0.1:1/prep' }), {}, 안끊김());
    expect(답).toMatchObject({ ok: false, 끊김: false, note: expect.stringMatching(/^연결 오류 · /) as unknown });
  });

  it('멈추면 요청을 끊고 끊김으로 돌려준다 — 준비 실패로 적지 않는다', async () => {
    대답 = () => undefined;
    const 끊개 = new AbortController();
    const 기다림 = 준비를부른다(준비(), {}, 끊개.signal);
    setTimeout(() => 끊개.abort(), 50);
    expect(await 기다림).toEqual({ ok: false, 끊김: true });
  });
});

describe('차례를잡는다', () => {
  it('같은 열쇠는 먼저 온 차례로 하나씩이고 다른 열쇠는 기다리지 않는다', async () => {
    const 차례: string[] = [];
    const 첫 = await 차례를잡는다(['a'], 안끊김());
    const 둘째 = 차례를잡는다(['a'], 안끊김()).then((x) => (차례.push('둘째'), x));
    const 셋째 = 차례를잡는다(['a'], 안끊김()).then((x) => (차례.push('셋째'), x));
    const 다른 = await 차례를잡는다(['b'], 안끊김());
    expect(다른.잡음).toBe(true);
    다른.놓기();
    await new Promise((끝) => setTimeout(끝, 20));
    expect(차례).toEqual([]);
    첫.놓기();
    (await 둘째).놓기();
    (await 셋째).놓기();
    expect(차례).toEqual(['둘째', '셋째']);
  });

  it('기다리다 끊기면 잡음 false 이고 뒤 실행은 앞 실행이 끝난 뒤에 돈다', async () => {
    const 첫 = await 차례를잡는다(['c'], 안끊김());
    const 끊개 = new AbortController();
    const 끊길것 = 차례를잡는다(['c'], 끊개.signal);
    let 뒤가잡음 = false;
    const 뒤 = 차례를잡는다(['c'], 안끊김()).then((x) => ((뒤가잡음 = true), x));
    끊개.abort();
    const 끊긴 = await 끊길것;
    expect(끊긴.잡음).toBe(false);
    끊긴.놓기();
    await new Promise((끝) => setTimeout(끝, 20));
    expect(뒤가잡음).toBe(false);
    첫.놓기();
    (await 뒤).놓기();
    expect(뒤가잡음).toBe(true);
  });

  it('열쇠를 글자 차례로 잡아 서로 다른 차례로 부른 둘이 멈추지 않는다', async () => {
    const 하나 = 차례를잡는다(['y', 'x'], 안끊김());
    const 둘 = 차례를잡는다(['x', 'y'], 안끊김());
    (await 하나).놓기();
    (await 둘).놓기();
  });
});
