// 실제 폰 Chrome 실측 — 이 컴퓨터 Chromium 을 「폰」으로 띄우고 가짜 VISION(기기 목록 · logcat · Chrome 연결 중계)을 앞에 세워 러너가 진짜 Playwright 자식으로 붙어 도는지 본다
// 폰 Chrome 처럼 기본 창 하나(about:blank 탭)만 연다. 창 새로 만들기 막기 · 상대 주소 · 기기 칸 · 영상 · logcat · 토큰 머리글은 단위 검사로 원리상 안 보여 여기서 잡는다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)

import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { connect, createServer as tcp서버, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type BrowserContext } from '@playwright/test';
import { runDir, type ExecuteRequest } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { execute } from '../src/execute.js';
import { executeScenario } from '../src/scenario.js';
import { 창하나글 } from './realPhone.js';

const 폴더 = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/real-phone');
const 토큰 = 'pat_xrp';
let 폰: BrowserContext;
let 앞서버: Server;
let 주소 = '';
const 받은토큰: Array<string | undefined> = [];
let 산출물 = '';
let 폰자료 = '';
const 옛값 = { 산출물: process.env.PLATFORM_ARTIFACTS_DIR, 테스트: process.env.PLATFORM_TESTS_DIR };

const 빈포트 = (): Promise<number> => new Promise((끝) => {
  const s = tcp서버().listen(0, '127.0.0.1', () => {
    const { port } = s.address() as AddressInfo;
    s.close(() => 끝(port));
  });
});

beforeAll(async () => {
  산출물 = mkdtempSync(join(tmpdir(), 'xrp-'));
  폰자료 = mkdtempSync(join(tmpdir(), 'xrp-phone-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 산출물;
  process.env.PLATFORM_TESTS_DIR = 폴더;
  const 폰포트 = await 빈포트();
  폰 = await chromium.launchPersistentContext(폰자료, { args: [`--remote-debugging-port=${String(폰포트)}`] });
  const { webSocketDebuggerUrl } = (await (await fetch(`http://127.0.0.1:${String(폰포트)}/json/version`)).json()) as { webSocketDebuggerUrl: string };
  const 폰길 = new URL(webSocketDebuggerUrl).pathname;

  앞서버 = createServer((req, res) => {
    if (req.url === '/api/devices') return res.end(JSON.stringify({ value: { devices: [{ serial: 'XRP1', model: 'SM-XRP', osVersion: '15' }] } }));
    if (req.url === '/api/devices/XRP1/logcat?app=1') {
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      return res.write('{"t":0,"pid":1,"tid":1,"level":"E","tag":"chromium","msg":"폰 Chrome 줄"}\n');
    }
    if (req.url === '/api/ping') return res.end('pong');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><h1 id="t">폰 화면</h1>');
  });
  // VISION 처럼 업그레이드 요청의 토큰을 보고 폰 Chrome DevTools 에 그대로 잇는다
  앞서버.on('upgrade', (req, socket, head) => {
    받은토큰.push(req.headers.authorization);
    const 위 = connect(폰포트, '127.0.0.1', () => {
      const 머리 = Object.entries(req.headers).filter(([k]) => k !== 'host' && k !== 'authorization').map(([k, v]) => `${k}: ${String(v)}`);
      위.write(`GET ${폰길} HTTP/1.1\r\nhost: 127.0.0.1:${String(폰포트)}\r\n${머리.join('\r\n')}\r\n\r\n`);
      위.write(head);
      socket.pipe(위).pipe(socket);
    });
    위.on('error', () => socket.destroy());
    socket.on('error', () => 위.destroy());
  });
  await new Promise<void>((끝) => 앞서버.listen(0, '127.0.0.1', 끝));
  주소 = `http://127.0.0.1:${String((앞서버.address() as AddressInfo).port)}`;
}, 60_000);

afterAll(async () => {
  for (const [키, 값] of [['PLATFORM_ARTIFACTS_DIR', 옛값.산출물], ['PLATFORM_TESTS_DIR', 옛값.테스트]] as const) {
    if (값 === undefined) delete process.env[키];
    else process.env[키] = 값;
  }
  앞서버.closeAllConnections();
  await new Promise((끝) => 앞서버.close(끝));
  await 폰.close();
  rmSync(산출물, { recursive: true, force: true });
  rmSync(폰자료, { recursive: true, force: true });
});

const 폰칸 = () => ({ cdpUrl: `${주소.replace('http', 'ws')}/api/devices/XRP1/chrome/cdp`, udid: 'XRP1', farmToken: 토큰 });
const 케이스 = (tcId: string, 덧: Partial<ExecuteRequest> = {}): ExecuteRequest => ({
  runId: 0, historyId: 0, tcId, platform: 'mobile', filePath: `${tcId}.spec.ts`, baseUrl: 주소, params: {}, expected: {}, timeoutMs: 60_000, ...폰칸(), ...덧,
});

describe('실제 폰 Chrome 실측 (브라우저)', () => {
  it('케이스 단독 — 폰 Chrome 의 탭에서 상대 주소로 돌고 기기 칸에 모델 · Android 판 · Chrome 판이 온다', async () => {
    const 결과 = await execute(케이스('XRP-001'), join(폴더, 'XRP-001.spec.ts'));

    expect(결과.error?.message).toBeUndefined();
    expect(결과.status).toBe('PASS');
    expect(결과.device).toMatchObject({ model: 'SM-XRP', osVersion: '15', appVersion: null, browser: expect.stringMatching(/^\d+\./) });
    expect(받은토큰.at(-1)).toBe(`Bearer ${토큰}`);
    // 연결만 끊는다 — 폰 Chrome 은 그대로 살아 있다
    expect(폰.pages().length).toBeGreaterThan(0);
  }, 90_000);

  it('케이스가 창을 새로 만들면 실패이고, 정식 실행이면 폰 화면 영상 · logcat 을 팜 증적 폴더에 남긴다', async () => {
    const 결과 = await execute(케이스('XRP-002', { runId: 91, historyId: 92 }), join(폴더, 'XRP-002.spec.ts'));

    expect(결과.status).toBe('FAIL');
    expect(JSON.stringify(결과)).toContain(창하나글);
    const 증적 = join(runDir('91', '92'), 'farm');
    expect(statSync(join(증적, 'video-1.webm')).size).toBeGreaterThan(0);
    expect(readFileSync(join(증적, 'logcat.txt'), 'utf8')).toContain('E chromium: 폰 Chrome 줄');
  }, 90_000);

  it('테스트 모드는 폰 Chrome 탭의 장면을 JPEG 로 쓴다 — 오른쪽 칸에 폰 화면이 뜬다', async () => {
    const 열쇠 = '0b7e2c1a-0000-4000-8000-000000000008';
    const 결과 = await execute(케이스('XRP-001', { live: 열쇠 }), join(폴더, 'XRP-001.spec.ts'));

    expect(결과.status).toBe('PASS');
    expect(readFileSync(join(산출물, 'live', `${열쇠}.jpg`)).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  }, 90_000);

  it('통과한 정식 실행은 증적을 안 남긴다', async () => {
    const 결과 = await execute(케이스('XRP-001', { runId: 93, historyId: 94 }), join(폴더, 'XRP-001.spec.ts'));

    expect(결과.status).toBe('PASS');
    expect(existsSync(join(runDir('93', '94'), 'farm'))).toBe(false);
    expect(existsSync(join(runDir('93', '94'), 'phone-video.webm'))).toBe(false);
  }, 90_000);

  it('시나리오 — 웹 단계가 폰 Chrome 탭 하나로 이어 돌고, 기기 칸 · 통과 못 한 정식 실행의 증적이 시나리오에 한 벌 온다', async () => {
    const 단계 = (tcId: string) => ({ kind: 'case' as const, tcId, params: {}, expected: {}, skipSteps: [], filePath: join(폴더, `${tcId}.spec.ts`) });
    const 결과 = await executeScenario({
      runId: 95, platform: 'mobile', baseUrl: 주소, timeoutMs: 60_000,
      parts: [단계('XRP-001'), 단계('XRP-001'), 단계('XRP-002')], ...폰칸(),
    });
    expect(받은토큰.at(-1)).toBe(`Bearer ${토큰}`);

    expect(결과.parts.map((p) => p.status)).toEqual(['PASS', 'PASS', 'FAIL']);
    expect(결과.parts[2]?.error?.message ?? JSON.stringify(결과.parts[2]?.steps)).toContain(창하나글);
    expect(결과.device).toMatchObject({ model: 'SM-XRP', osVersion: '15', browser: expect.stringMatching(/^\d+\./) });
    expect(statSync(join(runDir('95', 'scenario'), 'farm', 'video-1.webm')).size).toBeGreaterThan(0);
    expect(existsSync(join(runDir('95', 'scenario'), 'farm', 'logcat.txt'))).toBe(true);
  }, 90_000);
});
