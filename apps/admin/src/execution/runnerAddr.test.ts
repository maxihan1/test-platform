// admin 이 러너 GET /health 의 procedure 칸으로 프로시저를 못 도는 러너를 가르는지 본다 (도메인/실행 §3.2 「러너 능력」)

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { 프로시저못도는러너인가 } from './runnerAddr.js';

describe('프로시저못도는러너인가', () => {
  let 서버: Server | undefined;

  async function 러너(답: unknown, 상태 = 200): Promise<string> {
    서버 = createServer((_req, res) => {
      res.writeHead(상태, { 'content-type': 'application/json' });
      res.end(JSON.stringify(답));
    });
    await new Promise<void>((끝) => 서버!.listen(0, '127.0.0.1', 끝));
    return `http://127.0.0.1:${String((서버.address() as AddressInfo).port)}`;
  }

  afterEach(async () => {
    await new Promise<void>((끝) => (서버 === undefined ? 끝() : 서버.close(() => 끝())));
    서버 = undefined;
  });

  it('procedure: true 를 답한 러너는 프로시저를 돈다', async () => {
    expect(await 프로시저못도는러너인가(await 러너({ ok: true, playwrightVersion: '1.63.0', procedure: true }))).toBe(false);
  });

  it('답했는데 그 칸이 없으면 이전 버전 러너다 — 프로시저를 못 돈다', async () => {
    expect(await 프로시저못도는러너인가(await 러너({ ok: true, playwrightVersion: '1.63.0' }))).toBe(true);
  });

  it('오류로 답하면(러너 앞 프록시의 503) 모르는 것이라 막지 않는다', async () => {
    expect(await 프로시저못도는러너인가(await 러너({ error: 'upstream' }, 503))).toBe(false);
  });

  it('못 닿으면 모르는 것이라 막지 않는다', async () => {
    const 주소 = await 러너({});
    await new Promise<void>((끝) => 서버!.close(() => 끝()));
    서버 = undefined;
    expect(await 프로시저못도는러너인가(주소)).toBe(false);
  });
});
