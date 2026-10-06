// 시나리오 부품 창 — Playwright 창 · request 를 만들고 케이스가 쓰는 도구를 감싸 이어 주기 · 뒷정리 미루기를 건다. 판단은 links.ts 가 한다 (SPEC 도메인/러너 §5.2)
// 감싸는 자리는 여기 한 곳이다 — 부품 request · page.request · 케이스가 직접 만든 창과 연결 (2026-10-06 게이트 0 사용자)

import { pathToFileURL } from 'node:url';

import type { APIRequest, APIRequestContext, APIResponse, Browser, BrowserContext, Route } from '@playwright/test';

import { 가르기, 빈응답, 요청주소, 적기, type CasePart, type 미룬삭제, type 받은응답, type 부품상태, type 상태, type 이음 } from './links.js';
import { 합친상태, type RouteHandler, type 창 } from './parts.js';
import { 꺼냄 } from './wire.js';

type 연결옵션 = Parameters<APIRequest['newContext']>[0];

const 빈상태: 상태 = { cookies: [], origins: [] };
const API = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);

interface 도구묶음 {
  부품: 부품상태 | undefined;
  기준: string | undefined;
  // 미룬 삭제를 보낼 때 다시 싣는다 — Bearer 머리 · 기본 인증도 로그인 상태다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
  만들때: { headers?: Record<string, string>; httpCredentials?: 미룬삭제['httpCredentials'] };
  상태읽기(): Promise<상태>;
}

// Playwright 의 APIResponse 는 밖에서 못 만든다. 케이스는 판정을 verify 로만 하므로 같은 메서드만 갖춘다 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
function 가짜응답(r: 받은응답, url: string): APIResponse {
  const 값 = {
    ok: () => r.status >= 200 && r.status <= 299,
    status: () => r.status,
    statusText: () => '',
    url: () => url,
    headers: () => ({ 'content-type': r.contentType }),
    headersArray: () => [{ name: 'content-type', value: r.contentType }],
    body: async () => Buffer.from(r.body),
    text: async () => r.body,
    json: async (): Promise<unknown> => JSON.parse(r.body),
    dispose: async () => {},
    [Symbol.asyncDispose]: async () => {},
  };
  return 값 as unknown as APIResponse;
}

// 브라우저 응답과 API 응답이 같은 세 메서드를 가진다
async function 읽어둠(r: { status(): number; headers(): Record<string, string>; text(): Promise<string> }): Promise<받은응답> {
  return { status: r.status(), contentType: r.headers()['content-type'] ?? '', body: await r.text() };
}

function 쿼리(params: unknown): Record<string, string | number | boolean> | undefined {
  // ponytail: URLSearchParams · 글자 꼴 params 는 무늬 맞추기에 안 붙인다 — 표본 0. 보내는 요청에는 그대로 실린다
  return typeof params === 'object' && params !== null && !(params instanceof URLSearchParams)
    ? (params as Record<string, string | number | boolean>)
    : undefined;
}

// 닫기 실패는 결과를 바꾸지 않지만 흔적은 남긴다 — 창이 새는 것을 나중에 찾을 수 있게
const 남김 = (무엇: string) => (thrown: unknown): undefined => {
  console.warn(`[runner] ${무엇}: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
  return undefined;
};

// API 도구 하나를 감싼다. 케이스가 받는 모양은 그대로다 — 케이스 파일은 안 바뀐다 (SPEC 도메인/시나리오 §3.7 결정 12)
function 감싼도구(api: APIRequestContext, 이음값: 이음, 묶음: 도구묶음): APIRequestContext {
  return new Proxy(api, {
    get(target, prop) {
      const original: unknown = Reflect.get(target, prop, target);
      if (typeof original !== 'function') return original;
      const call = (original as (...args: unknown[]) => unknown).bind(target);
      if (typeof prop !== 'string' || !API.has(prop)) return call;
      return async (주소: unknown, options?: Record<string, unknown>): Promise<APIResponse> => {
        if (typeof 주소 !== 'string') return (await call(주소, options)) as APIResponse;
        const method = prop === 'fetch' ? String(options?.method ?? 'GET').toUpperCase() : prop.toUpperCase();
        const url = 요청주소(주소, 묶음.기준, 쿼리(options?.params));
        const { 부품 } = 묶음;
        const 가름 = await 가르기(이음값, 부품, 'api', method, url);
        if (가름.kind === 'fail') throw new Error(가름.message);
        if (가름.kind === 'fulfill') return 가짜응답(가름.응답, url);
        if (가름.kind === 'defer' && 부품 !== undefined) {
          // 모을 때의 로그인 상태 — 도구가 이미 닫혔으면 한도에 걸려 닫기 직전에 찍은 것 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
          const state = await 묶음.상태읽기().catch(() => 부품.찍은상태 ?? 빈상태);
          const headers = { ...묶음.만들때.headers, ...(options?.headers as Record<string, string> | undefined) };
          이음값.미룸.push({ fromSeq: 부품.seq, url, headers, state, httpCredentials: 묶음.만들때.httpCredentials });
          return 가짜응답(빈응답, url);
        }
        const 응답 = (가름.kind === 'send' && 가름.url !== undefined
          ? await target.fetch(가름.url, { ...options, params: undefined, method: 가름.method })
          : await call(주소, options)) as APIResponse;
        if (부품 !== undefined) 적기(이음값, 부품.seq, method, url, () => 읽어둠(응답));
        return 응답;
      };
    },
  });
}

// 창의 브라우저 요청에 이어 주기를 건다. 모킹보다 나중에 걸어야 먼저 돈다(Playwright 는 나중 route 가 먼저). 손 안 대면 fallback —
// continue 는 먼저 건 모킹을 건너뛰고 진짜 서버로 간다. 오류면 abort — 그냥 보내면 막으려던 준비가 서버를 바꾼다.
// route 가 이미 맞춘 무늬를 가르기에 넘긴다 — 손으로 옮긴 무늬 맞추기가 갈라 조용히 안 걸리지 않게 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
async function 이어주기걸기(context: BrowserContext, 이음값: 이음, 부품: 부품상태): Promise<void> {
  const 무늬들 = new Set(부품.links.flatMap((link) => (link.kind === 'bind' ? [] : [link.urlPattern])));
  for (const 무늬 of 무늬들) {
    await context.route(무늬, async (route: Route) => {
      const req = route.request();
      const 가름 = await 가르기(이음값, 부품, 'browser', req.method(), req.url(), 무늬);
      if (가름.kind === 'fulfill') await route.fulfill({ status: 가름.응답.status, contentType: 가름.응답.contentType, body: 가름.응답.body });
      else if (가름.kind === 'fail') await route.abort();
      else if (가름.kind === 'send' && 가름.url !== undefined) await route.fallback({ url: 가름.url, ...(가름.method === undefined ? {} : { method: 가름.method }) });
      else await route.fallback();
    });
  }
}

// 가리킨 부품이면 창의 응답을 적는다. 자리는 오는 순간 잡는다. 3xx 는 본문을 못 읽어 자리만 차지하므로 건너뛴다 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
function 응답듣기(context: BrowserContext, 이음값: 이음, 부품: 부품상태): void {
  if (!이음값.가리킴.some((g) => g.fromSeq === 부품.seq)) return;
  context.on('response', (res) => {
    if (res.status() >= 300 && res.status() < 400) return;
    적기(이음값, 부품.seq, res.request().method(), res.url(), () => 읽어둠(res));
  });
}

interface 지금부품 {
  부품: 부품상태;
  // 부품이 끝나면 같이 닫는다 — 한도에 걸린 부품의 요청이 뒤에서 계속 서버를 두드리면 안 된다 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
  직접만든: Array<() => Promise<void>>;
  // 부품 창을 닫은 뒤(한도에 걸려 케이스가 아직 도는 중) 새로 만드는 창 · 연결은 만들자마자 닫는다
  닫힘: boolean;
}

export interface 감싸기설정 {
  baseUrl: string;
  platform: string;
  // 프로젝트 use 의 머리글 — 미룬 삭제는 머리글을 명시해 보내므로 Playwright 가 기본값을 안 채운다. 그래서 아래에 깐다
  기본머리?: Record<string, string>;
  // 미룬 삭제 하나의 Playwright 요청 한도 — parts.ts 의 상한과 같은 값이라 매달린 요청이 남지 않는다
  뒷정리한도: number;
}

// 시나리오 동안 브라우저의 창 만들기와 @playwright/test 의 연결 만들기를 감싼다. 케이스가 require 로 불러도 같은 객체다 (2026-10-06 이미지 탐침)
export function 감싸기걸기(browser: Browser, 요청도구: APIRequest, 이음값: 이음, 설정: 감싸기설정) {
  const 원래창 = browser.newContext.bind(browser);
  const 원래요청 = 요청도구.newContext.bind(요청도구);
  let 지금: 지금부품 | undefined;
  let 걸린: ReadonlyMap<string, RouteHandler> = new Map();

  const 묶음 = (부품: 부품상태 | undefined, 상태읽기: () => Promise<상태>, options?: 연결옵션): 도구묶음 => ({
    부품, 상태읽기, 기준: options?.baseURL ?? 설정.baseUrl,
    만들때: { headers: options?.extraHTTPHeaders, httpCredentials: options?.httpCredentials },
  });

  // 한도에 걸린 부품이 늦게 만든 것은 받자마자 닫는다
  const 늦은것 = async (닫기: () => Promise<void>): Promise<never> => {
    await 닫기().catch(남김('한도에 걸린 부품이 늦게 만든 창 · 연결을 못 닫았다'));
    throw new Error('부품 제한 시간이 지난 부품이 창 · 연결을 새로 만들려 했다');
  };

  // Browser.newPage 도 안에서 this.newContext 를 부른다 — 이것 하나로 둘 다 잡힌다. 로그인 상태는 안 옮긴다 — 다른 계정으로 들어가려고 여는 창이다
  browser.newContext = async (options) => {
    const c = await 원래창(options);
    const 부품 = 지금;
    if (부품 === undefined) return c;
    if (부품.닫힘) return 늦은것(() => c.close());
    (c as { request: APIRequestContext }).request = 감싼도구(c.request, 이음값, 묶음(부품.부품, () => c.storageState(), options));
    for (const [무늬, handler] of 걸린) await c.route(무늬, handler);
    await 이어주기걸기(c, 이음값, 부품.부품);
    응답듣기(c, 이음값, 부품.부품);
    부품.직접만든.push(() => c.close());
    return c;
  };

  요청도구.newContext = async (options) => {
    const r = await 원래요청(options);
    const 부품 = 지금;
    if (부품 === undefined) return r;
    if (부품.닫힘) return 늦은것(() => r.dispose());
    부품.직접만든.push(() => r.dispose());
    return 감싼도구(r, 이음값, 묶음(부품.부품, () => r.storageState(), options));
  };

  return {
    async newWindow(state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>, 부품?: 부품상태): Promise<창> {
      걸린 = mocks;
      // 디바이스(화면 크기 · 사용자 에이전트) · baseURL 은 Playwright 가 프로젝트 use 로 채운다 (playwright/lib/index.js runBeforeCreateBrowserContext)
      const context = await 원래창(state === undefined ? {} : { storageState: state });
      const 창request = context.request;
      const 이번: 지금부품 | undefined = 부품 === undefined ? undefined : { 부품, 직접만든: [], 닫힘: false };
      const 부품요청 = 부품 === undefined ? undefined : await 원래요청(state === undefined ? {} : { storageState: state });
      if (부품 !== undefined) {
        // 창을 만든 뒤 request 를 바꿔 끼우면 그 뒤 newPage 의 page.request 도 감싼 것이다 — Page 생성자가 창의 request 를 그대로 받는다
        (context as { request: APIRequestContext }).request = 감싼도구(창request, 이음값, 묶음(부품, () => context.storageState()));
      }
      for (const [무늬, handler] of mocks) await context.route(무늬, handler);
      if (부품 !== undefined) {
        await 이어주기걸기(context, 이음값, 부품);
        응답듣기(context, 이음값, 부품);
      }
      const page = await context.newPage();
      let 닫음 = false;

      return {
        route: async (url, handler) => {
          await context.route(url, handler);
        },
        unroute: (url, handler) => context.unroute(url, handler),
        waitForTimeout: (ms) => page.waitForTimeout(ms),
        // API 부품은 감싸지 않은 창의 request — 진짜 서버에 상태를 심는 뒷문이라 모킹 · 이어 주기를 안 거친다 (SPEC 도메인/시나리오 §3.7 결정 6)
        fetch: (url, options) => 창request.fetch(url, options),
        async runCase(part: CasePart, seq, phase, params) {
          if (이번 === undefined || 부품요청 === undefined) throw new Error('부품 없이 연 창에서 케이스를 돌리려 했다');
          // 같은 케이스를 두 번 쓰면 두 번째 import 는 캐시다. 등록부가 안 지우므로 그대로 꺼내진다
          await import(pathToFileURL(part.filePath ?? '').href);
          const run = 꺼냄(part.tcId);
          if (run === undefined) throw new Error(`${part.filePath ?? '(경로 없음)'} 가 ${part.tcId} 를 등록하지 않았다`);
          지금 = 이번;
          try {
            const outcome = await run({
              page,
              request: 감싼도구(부품요청, 이음값, 묶음(이번.부품, () => 부품요청.storageState())),
              platform: 설정.platform, params, expected: part.expected, skipSteps: part.skipSteps, seq, phase,
            });
            // 창을 닫으면 본문을 못 읽는다 — 이 부품이 잡은 자리를 다 읽을 때까지 기다린다(부품 한도 경주 안). 자리는 못 읽으면 사유 글자라 던지지 않는다
            await Promise.all(이음값.응답.values());
            return outcome;
          } finally {
            지금 = undefined;
          }
        },
        state: async () => 합친상태(await context.storageState(), 부품요청 === undefined ? 빈상태 : await 부품요청.storageState()),
        async close() {
          if (닫음) return;
          닫음 = true;
          if (이번 !== undefined) 이번.닫힘 = true;
          for (const 닫기 of 이번?.직접만든 ?? []) await 닫기().catch(남김('케이스가 직접 만든 창 · 연결을 못 닫았다'));
          await 부품요청?.dispose().catch(남김('부품 request 를 못 닫았다'));
          await context.close().catch(남김('부품 창을 못 닫았다'));
        },
      };
    },

    // 모을 때의 로그인 상태로 새 연결을 만들어 보낸다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
    async sendDelete(d: 미룬삭제): Promise<number> {
      const 연결 = await 원래요청({
        storageState: d.state,
        extraHTTPHeaders: { ...설정.기본머리, ...d.headers },
        httpCredentials: d.httpCredentials,
      });
      try {
        return (await 연결.fetch(d.url, { method: 'DELETE', timeout: 설정.뒷정리한도 })).status();
      } finally {
        await 연결.dispose().catch(남김('뒷정리 연결을 못 닫았다'));
      }
    },

    되돌리기() {
      browser.newContext = 원래창;
      요청도구.newContext = 원래요청;
    },
  };
}
