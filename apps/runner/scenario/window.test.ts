// 고정 spec 감싸기 검사 — 브라우저 없이 가짜 Browser · APIRequest 로 미룬 삭제 연결 옵션 · 응답 적기를 본다 (SPEC 도메인/러너 §5.2)

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { APIRequest, APIRequestContext, Browser, BrowserContext } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import { 응답듣기 } from './browser.js';
import { 새부품, 새이음, type 미룬삭제 } from './links.js';
import { 가짜플창, 쿠키 } from './parts-fake.js';
import { 감싸기걸기, 만들때값, type 감싸기설정 } from './window.js';

const 설정 = { baseUrl: 'https://qa.example.com', platform: 'desktop', 기본머리: { 'x-tenant': 'qa' }, 기본인증: { username: 'qa', password: 'pw' } };

describe('만들때값 — 미룬 삭제에 다시 실을 로그인 상태 (Playwright 와 같은 규칙: 그 칸을 안 줬을 때만 프로젝트 기본값)', () => {
  it('옵션 없이 만든 도구(부품 request · page.request)는 프로젝트 기본 머리글 · 기본 인증을 쓴다', () => {
    expect(만들때값(undefined, 설정)).toEqual({ headers: { 'x-tenant': 'qa' }, httpCredentials: { username: 'qa', password: 'pw' } });
  });

  it('케이스가 그 칸을 주고 만든 연결은 준 것만 쓴다 — 기본값을 깔지 않는다', () => {
    expect(만들때값({ extraHTTPHeaders: { 'x-tenant': 'other' } }, 설정)).toEqual({
      headers: { 'x-tenant': 'other' }, httpCredentials: { username: 'qa', password: 'pw' },
    });
    expect(만들때값({ httpCredentials: undefined }, 설정)).toEqual({ headers: { 'x-tenant': 'qa' }, httpCredentials: undefined });
  });
});

describe('sendDelete', () => {
  // 감싸기걸기가 newContext 를 감싼 것으로 바꿔 끼우므로 원래 가짜 함수는 따로 쥔다
  const 가짜 = () => {
    const 연결 = { fetch: vi.fn(async () => ({ status: () => 200 })), dispose: vi.fn(async () => {}) };
    const 만들기 = vi.fn(async (_options?: object) => 연결);
    const 요청도구 = { newContext: 만들기 } as unknown as APIRequest;
    const 브라우저 = { newContext: vi.fn() } as unknown as Browser;
    return { 연결, 요청도구: { newContext: 만들기 }, 감싸기: 감싸기걸기(브라우저, 요청도구, 새이음([], 설정.baseUrl), 설정) };
  };
  const 미룸 = (칸: Partial<미룬삭제> = {}): 미룬삭제 => ({ fromSeq: 1, url: 'https://qa.example.com/api/posts/1', headers: {}, state: { cookies: [], origins: [] }, ...칸 });

  it('기본 인증이 없으면 그 칸을 아예 안 넣는다 — undefined 로라도 넣으면 Playwright 가 프로젝트 기본값을 안 채운다', async () => {
    const { 요청도구, 감싸기 } = 가짜();

    await 감싸기.sendDelete(미룸(), 1000);

    const 옵션 = vi.mocked(요청도구.newContext).mock.calls[0]![0]!;
    expect('httpCredentials' in 옵션).toBe(false);
  });

  it('모을 때의 머리글 · 기본 인증 · 쿠키를 그대로 싣고 요청 한도를 건다', async () => {
    const { 연결, 요청도구, 감싸기 } = 가짜();
    const 인증 = { username: 'u', password: 'p' };

    await expect(감싸기.sendDelete(미룸({ headers: { a: '1' }, httpCredentials: 인증 }), 1000)).resolves.toBe(200);

    expect(vi.mocked(요청도구.newContext)).toHaveBeenCalledWith({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { a: '1' }, httpCredentials: 인증 });
    expect(연결.fetch).toHaveBeenCalledWith('https://qa.example.com/api/posts/1', { method: 'DELETE', timeout: 1000 });
    expect(연결.dispose).toHaveBeenCalled();
  });

  it('모은 삭제의 쿼리 · 본문을 그대로 실어 보낸다 — 글자 · URLSearchParams 꼴 params 는 물음표 뒤를 갈아 끼운다(Playwright 와 같다)', async () => {
    const 이음 = 새이음([], 설정.baseUrl);
    const 부품 = 새부품(1, []);
    부품.phase.started = true;
    const 빈 = { cookies: [], origins: [] };
    const { 창 } = 가짜플창(설정.baseUrl);
    const 원래도구 = 창.request;
    const 연결 = { fetch: vi.fn(async () => ({ status: () => 204 })), dispose: vi.fn(async () => {}), storageState: vi.fn(async () => 빈) };
    const 감싸기 = 감싸기걸기(
      { newContext: vi.fn(async () => 창) } as unknown as Browser,
      { newContext: vi.fn(async () => 연결) } as unknown as APIRequest,
      이음, 설정,
    );
    const 공용 = await 감싸기.newWindow(new Map());
    await 공용.단계(부품, true);

    const 도구 = 창.request as unknown as APIRequestContext;
    await 도구.delete('/api/cart?old=1', { params: 'itemId=7' });
    await 도구.delete('/api/cart', { params: new URLSearchParams({ itemId: '8' }), data: { all: true } });
    const 고쳐쓰는 = { reason: 'x' };
    await 도구.delete('/api/cart', { params: { itemId: 9 }, form: 고쳐쓰는 });
    고쳐쓰는.reason = 'y';
    await 도구.delete('/api/cart?keep=1', { params: new URLSearchParams() });

    expect(이음.미룸.map((d) => d.url)).toEqual([
      'https://qa.example.com/api/cart?itemId=7', 'https://qa.example.com/api/cart?itemId=8', 'https://qa.example.com/api/cart?itemId=9',
      'https://qa.example.com/api/cart?keep=1',
    ]);
    expect(원래도구.delete).not.toHaveBeenCalled();
    await 감싸기.sendDelete(이음.미룸[1]!, 1000);
    await 감싸기.sendDelete(이음.미룸[2]!, 1000);
    expect(연결.fetch.mock.calls).toEqual([
      ['https://qa.example.com/api/cart?itemId=8', expect.objectContaining({ method: 'DELETE', timeout: 1000, data: { all: true } })],
      ['https://qa.example.com/api/cart?itemId=9', expect.objectContaining({ method: 'DELETE', timeout: 1000, form: { reason: 'x' } })],
    ]);
  });
});

describe('성능 녹화 — PLATFORM_RECORD_HAR_DIR 이 있으면 창을 열 때마다 HAR 를 차례로 건다', () => {
  it('폴더가 없으면 아무것도 더하지 않고, 있으면 1.har · 2.har 순으로 건다', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'win-har-'));
    const 열기 = vi.fn(async (_options?: object) => ({}) as BrowserContext);
    const 브라우저 = { newContext: 열기 } as unknown as Browser;
    try {
      감싸기걸기(브라우저, { newContext: vi.fn() } as unknown as APIRequest, 새이음([], 설정.baseUrl), 설정);
      await 브라우저.newContext({});
      expect(열기.mock.calls[0]![0]).not.toHaveProperty('recordHar');

      process.env.PLATFORM_RECORD_HAR_DIR = 폴더;
      await 브라우저.newContext({});
      await 브라우저.newContext({});
      expect(열기.mock.calls[1]![0]).toMatchObject({ recordHar: { path: join(폴더, '1.har'), content: 'embed' } });
      expect(열기.mock.calls[2]![0]).toMatchObject({ recordHar: { path: join(폴더, '2.har'), content: 'embed' } });
    } finally {
      delete process.env.PLATFORM_RECORD_HAR_DIR;
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});

describe('응답듣기', () => {
  it('가리킨 부품의 응답을 적고, 3xx 는 본문을 못 읽어 자리만 차지하므로 건너뛴다', async () => {
    const 이음 = 새이음([
      { kind: 'case', tcId: 'A-001', params: {}, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'A-002', params: {}, expected: {}, skipSteps: [], links: [{ kind: 'bind', param: 'x', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts', jsonPath: 'id' } }] },
    ], 설정.baseUrl);
    let 들음: ((res: unknown) => void) | undefined;
    const 끔 = vi.fn();
    const 창 = { on: (_이름: string, f: (res: unknown) => void) => { 들음 = f; }, off: 끔 } as unknown as BrowserContext;
    const 응답 = (status: number) => ({
      status: () => status, url: () => 'https://qa.example.com/api/posts', headers: () => ({ 'content-type': 'application/json' }),
      text: async () => '{"id":812}', request: () => ({ method: () => 'POST' }),
    });

    const 듣기끔 = 응답듣기(창, 이음, 새부품(1, []));
    들음!(응답(302));
    expect(이음.응답.size).toBe(0);
    들음!(응답(201));

    await expect(이음.응답.get('1 POST **/api/posts')).resolves.toEqual({ status: 201, contentType: 'application/json', body: '{"id":812}' });
    // 창을 다음 단계가 이어 쓰므로 단계 끝에 뗀다 — 안 떼면 다음 단계 응답이 이 단계 자리에 적힌다
    듣기끔();
    expect(끔).toHaveBeenCalledWith('response', 들음);
  });
});

describe('창 하나 — 공용 창 · 단계 열기 · 단계 닫기 (SPEC 도메인/시나리오 §3.7 결정 3 · 러너 §5.2 「창 하나로 끝까지」)', () => {
  const 판 = (빈창 = 가짜플창(설정.baseUrl)) => {
    const 단계요청 = { storageState: vi.fn(async () => ({ cookies: [쿠키('api')], origins: [] })), dispose: vi.fn(async () => {}) };
    const 열기 = vi.fn(async (_options?: object) => 빈창.창);
    const 요청열기 = vi.fn(async (_options?: object) => 단계요청);
    const 감싸기 = 감싸기걸기({ newContext: 열기 } as unknown as Browser, { newContext: 요청열기 } as unknown as APIRequest, 새이음([], 설정.baseUrl), 설정);
    return { ...빈창, 단계요청, 열기, 요청열기, 감싸기 };
  };

  it('창 · 탭은 시작에 한 번만 연다 — 단계마다 새로 만드는 것은 창 쿠키를 든 단계 request 뿐이다', async () => {
    const { 창, 열기, 요청열기, 감싸기 } = 판();
    창.cookies.mockResolvedValue([쿠키('sid')]);
    const 공용 = await 감싸기.newWindow(new Map());

    const 첫 = await 공용.단계(새부품(1, []), true);
    await 첫.close();
    const 둘 = await 공용.단계(새부품(2, []), true);
    await 둘.close();

    expect(열기).toHaveBeenCalledTimes(1);
    expect(창.newPage).toHaveBeenCalledTimes(1);
    expect(요청열기.mock.calls).toEqual([[{ storageState: { cookies: [쿠키('sid')], origins: [] } }], [{ storageState: { cookies: [쿠키('sid')], origins: [] } }]]);
    expect(창.close).not.toHaveBeenCalled();
    await 공용.close();
    expect(창.close).toHaveBeenCalledTimes(1);
  });

  it('단계를 닫으면 단계 request 쿠키 가운데 창에 없는 것만 창에 더하고, 이어 주기 · 창 request 를 원래대로 돌린다', async () => {
    const { 창, 단계요청, 감싸기 } = 판();
    창.cookies.mockResolvedValue([쿠키('sid', 'qa.example.com', '창')]);
    단계요청.storageState.mockResolvedValue({ cookies: [쿠키('sid', 'qa.example.com', '요청'), 쿠키('api')], origins: [] });
    const 원래request = 창.request;
    const 공용 = await 감싸기.newWindow(new Map());

    const 단계 = await 공용.단계(새부품(1, [{ kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' }]), true);
    expect(창.request).not.toBe(원래request);
    const 뗄것 = await 창.route.mock.results[0]!.value as { dispose: () => Promise<void> };
    await 단계.close();

    expect(창.addCookies).toHaveBeenCalledWith([쿠키('api')]);
    expect(단계요청.dispose).toHaveBeenCalled();
    expect(뗄것.dispose).toHaveBeenCalled();
    expect(창.request).toBe(원래request);
  });

  it('넘겨받기를 끈 단계는 같은 창에서 쿠키 · localStorage 를 비우고 지금 탭의 sessionStorage 를 지운 뒤 빈 화면에서 시작한다', async () => {
    const { 창, 탭, 감싸기 } = 판();
    const 공용 = await 감싸기.newWindow(new Map());

    await 공용.단계(새부품(1, []), true);
    expect(창.setStorageState).not.toHaveBeenCalled();
    await 공용.단계(새부품(2, []), false);

    expect(창.setStorageState).toHaveBeenCalledWith({ cookies: [], origins: [] });
    expect(탭.evaluate).toHaveBeenCalledTimes(1);
    // 앞 화면이 메모리에 쥔 로그인으로 돌지 않게 빈 화면에서 시작한다
    expect(탭.goto).toHaveBeenCalledWith('about:blank');
  });

  it('한도에 걸려 끊음으로 닫으면 쿠키를 안 더하고 창째 닫는다', async () => {
    const { 창, 단계요청, 감싸기 } = 판();
    const 공용 = await 감싸기.newWindow(new Map());

    const 단계 = await 공용.단계(새부품(1, []), true);
    await 단계.close(true);
    await 단계.close();

    expect(창.addCookies).not.toHaveBeenCalled();
    expect(단계요청.dispose).toHaveBeenCalledTimes(1);
    expect(창.close).toHaveBeenCalledTimes(1);
  });

  it('테스트 모드는 웹 단계 탭에 장면을 걸고 앱 · 게임 단계 동안은 꺼서 비운다 — 다음 웹 단계에서 다시 건다 (러너 §5.2 「테스트 모드 — 실시간 장면」)', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'scn-live-'));
    vi.stubEnv('PLATFORM_LIVE_FILE', join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000005.jpg'));
    // 러너는 시험 실행에 늘 늦추기 값을 같이 준다 — 자식에게는 그것이 누른 곳을 그리는 테스트 모드 표시다
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    try {
      const { 탭, 감싸기 } = 판();
      const 장면 = { start: vi.fn(async () => ({})), showActions: vi.fn(async () => ({})), stop: vi.fn(async () => {}) };
      Object.assign(탭, { screencast: 장면, once: vi.fn(), off: vi.fn() });
      const 공용 = await 감싸기.newWindow(new Map());
      expect(장면.start).not.toHaveBeenCalled();

      await (await 공용.단계(새부품(1, []), true)).close();
      await (await 공용.단계(새부품(2, []), true)).close();
      expect(장면.start).toHaveBeenCalledTimes(1);
      expect(장면.showActions).toHaveBeenCalledTimes(1);

      await (await 감싸기.appWindow(새부품(3, []), { cookies: [], origins: [] })).close();
      expect(장면.stop).toHaveBeenCalledTimes(1);

      await 공용.단계(새부품(4, []), true);
      expect(장면.start).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllEnvs();
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('테스트 모드의 앱 · 게임 단계는 폰을 얻은 뒤 Appium 으로 폰 화면을 찍고, 단계를 닫으면 그친다 (러너 §5.2 「테스트 모드 — 실시간 장면」)', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'scn-phone-live-'));
    const 장면파일 = join(폴더, 'live', '0b7e2c1a-0000-4000-8000-000000000006.jpg');
    const 케이스파일 = join(폴더, 'XAP-LIVE.mjs');
    writeFileSync(케이스파일, '');
    const 등록부 = ((globalThis as unknown as Record<symbol, Map<string, unknown> | undefined>)[Symbol.for('platform.scenarioCases')] ??= new Map());
    등록부.set('XAP-LIVE', async () => ({ seq: 1, steps: [], failed: false }));
    const takeScreenshot = vi.fn(async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'));
    vi.stubEnv('PLATFORM_LIVE_FILE', 장면파일);
    vi.stubEnv('PLATFORM_SLOW_MO', '1000');
    try {
      const 단계요청 = { storageState: vi.fn(async () => ({ cookies: [], origins: [] })), dispose: vi.fn(async () => {}) };
      const 폰 = { 얻기: vi.fn(async () => ({ driver: { takeScreenshot } })), 닫기: vi.fn(async () => {}) } as unknown as NonNullable<감싸기설정['폰']>;
      const 감싸기 = 감싸기걸기({ newContext: vi.fn() } as unknown as Browser, { newContext: vi.fn(async () => 단계요청) } as unknown as APIRequest, 새이음([], 설정.baseUrl), { ...설정, 폰 });

      const 앱 = await 감싸기.appWindow(새부품(1, []), { cookies: [], origins: [] });
      await 앱.runCase({ kind: 'case', tcId: 'XAP-LIVE', params: {}, expected: {}, skipSteps: [], filePath: 케이스파일, appStep: true }, 0, { started: false, inStep: 0, judged: false }, {});
      await vi.waitFor(() => expect(existsSync(장면파일)).toBe(true));
      await 앱.close();
      const 찍은수 = takeScreenshot.mock.calls.length;
      await new Promise((끝) => setTimeout(끝, 50));

      expect(takeScreenshot.mock.calls.length).toBe(찍은수);
      expect(existsSync(장면파일)).toBe(false);
    } finally {
      등록부.delete('XAP-LIVE');
      vi.unstubAllEnvs();
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('첫 탭이 닫혔으면 다음 단계 전에 새 탭을 첫 탭으로 연다', async () => {
    const { 창, 탭, 감싸기 } = 판();
    const 공용 = await 감싸기.newWindow(new Map());
    탭.isClosed = () => true;

    await 공용.단계(새부품(1, []), true);

    expect(창.newPage).toHaveBeenCalledTimes(2);
  });
});
