// 시나리오 부품 창 — Playwright 창 · request 를 만들고 케이스가 쓰는 도구를 감싸 이어 주기 · 뒷정리 미루기를 건다. 판단은 links.ts 가 한다 (SPEC 도메인/러너 §5.2)
// 감싸는 자리는 여기 한 곳이다 — 부품 request · page.request · 케이스가 직접 만든 창과 연결 (2026-10-06 게이트 0 사용자)

import { pathToFileURL } from 'node:url';

import type { APIRequest, APIRequestContext, APIResponse, Browser, BrowserContext, Route } from '@playwright/test';
import type { ScenarioExecuteRequest } from '@platform/kit';

import { 가르기, 요청주소, 적기, type 미룬삭제, type 받은응답, type 부품상태, type 상태, type 이음 } from './links.js';
import { 합친상태, type RouteHandler, type 창 } from './parts.js';
import { 꺼냄 } from './wire.js';

type CasePart = Extract<ScenarioExecuteRequest['parts'][number], { kind: 'case' }>;
type 창만들기 = Browser['newContext'];
type 요청만들기 = APIRequest['newContext'];

const 빈상태: 상태 = { cookies: [], origins: [] };
const 빈응답: 받은응답 = { status: 200, contentType: 'application/json', body: '{}' };
const API = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);

interface 도구묶음 {
  이음: 이음;
  부품: 부품상태 | undefined;
  기준: string | undefined;
  // 미룬 삭제를 보낼 때 다시 싣는다 — Bearer 머리 · 기본 인증도 로그인 상태다 (계획 결정 6)
  만들때: { headers?: Record<string, string>; httpCredentials?: 미룬삭제['httpCredentials'] };
  상태읽기(): Promise<상태>;
  // 부품 끝에서 다 읽을 때까지 기다린다 — 창을 닫으면 본문을 못 읽는다 (계획 결정 13)
  대기: Promise<unknown>[];
}

// Playwright 의 APIResponse 는 밖에서 못 만든다. 케이스는 판정을 verify 로만 하므로 같은 메서드만 갖춘다 (계획 결정 8)
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

function 쿼리(params: unknown): Record<string, string | number | boolean> | undefined {
  // ponytail: URLSearchParams · 글자 꼴 params 는 무늬 맞추기에 안 붙인다 — 표본 0. 보내는 요청에는 그대로 실린다
  return typeof params === 'object' && params !== null && !(params instanceof URLSearchParams)
    ? (params as Record<string, string | number | boolean>)
    : undefined;
}

// API 도구 하나를 감싼다. 케이스가 받는 모양은 그대로다 — 케이스 파일은 안 바뀐다 (SPEC 도메인/시나리오 §3.7 결정 12)
function 감싼도구(api: APIRequestContext, 묶음: 도구묶음): APIRequestContext {
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
        const { 이음, 부품 } = 묶음;
        const 가름 = await 가르기(이음, 부품, 'api', method, url);
        if (가름.kind === 'fail') throw new Error(가름.message);
        if (가름.kind === 'fulfill') return 가짜응답(가름.응답, url);
        if (가름.kind === 'defer' && 부품 !== undefined) {
          // 모을 때의 로그인 상태 — 창이 이미 닫혔으면 한도에 걸려 닫기 직전에 찍은 것 (계획 결정 6)
          const state = await 묶음.상태읽기().catch(() => 부품.찍은상태 ?? 빈상태);
          const headers = { ...묶음.만들때.headers, ...(options?.headers as Record<string, string> | undefined) };
          이음.미룸.push({ fromSeq: 부품.seq, url, headers, state, ...(묶음.만들때.httpCredentials === undefined ? {} : { httpCredentials: 묶음.만들때.httpCredentials }) });
          return 가짜응답(빈응답, url);
        }
        const 응답 = (가름.kind === 'send' && 가름.url !== undefined
          ? await target.fetch(가름.url, { ...options, params: undefined, method: 가름.method })
          : await call(주소, options)) as APIResponse;
        if (부품 !== undefined) {
          적기(이음, 부품.seq, method, url, () => {
            const 읽기 = (async () => ({ status: 응답.status(), contentType: 응답.headers()['content-type'] ?? '', body: await 응답.text() }))();
            묶음.대기.push(읽기);
            return 읽기;
          });
        }
        return 응답;
      };
    },
  });
}

// 창의 브라우저 요청에 이어 주기를 건다. 모킹보다 나중에 걸어야 먼저 돈다(Playwright 는 나중 route 가 먼저). 손 안 대면 fallback —
// continue 는 먼저 건 모킹을 건너뛰고 진짜 서버로 간다. 오류면 abort — 그냥 보내면 막으려던 준비가 서버를 바꾼다 (계획 결정 14)
async function 이어주기걸기(context: BrowserContext, 이음값: 이음, 부품: 부품상태): Promise<void> {
  const 무늬들 = new Set(부품.links.flatMap((link) => (link.kind === 'bind' ? [] : [link.urlPattern])));
  for (const 무늬 of 무늬들) {
    await context.route(무늬, async (route: Route) => {
      const req = route.request();
      const 가름 = await 가르기(이음값, 부품, 'browser', req.method(), req.url());
      if (가름.kind === 'fulfill') await route.fulfill({ status: 가름.응답.status, contentType: 가름.응답.contentType, body: 가름.응답.body });
      else if (가름.kind === 'fail') await route.abort();
      else if (가름.kind === 'send' && 가름.url !== undefined) await route.fallback({ url: 가름.url, ...(가름.method === undefined ? {} : { method: 가름.method }) });
      else await route.fallback();
    });
  }
}

// 가리킨 부품이면 창의 응답을 적는다. 자리는 오는 순간 잡는다 (계획 결정 13)
function 응답듣기(context: BrowserContext, 이음값: 이음, 부품: 부품상태, 대기: Promise<unknown>[]): void {
  if (!이음값.가리킴.some((g) => g.fromSeq === 부품.seq)) return;
  context.on('response', (res) => {
    적기(이음값, 부품.seq, res.request().method(), res.url(), () => {
      const 읽기 = (async () => ({ status: res.status(), contentType: res.headers()['content-type'] ?? '', body: await res.text() }))();
      대기.push(읽기);
      return 읽기;
    });
  });
}

interface 지금부품 {
  부품: 부품상태;
  대기: Promise<unknown>[];
  // 부품이 끝나면 같이 닫는다 — 한도에 걸린 부품의 요청이 뒤에서 계속 서버를 두드리면 안 된다 (계획 결정 10)
  직접만든: Array<() => Promise<void>>;
}

export interface 감싸기 {
  newWindow(state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>, 부품?: 부품상태): Promise<창>;
  sendDelete(d: 미룬삭제): Promise<number>;
  되돌리기(): void;
}

// 시나리오 동안 브라우저의 창 만들기와 @playwright/test 의 연결 만들기를 감싼다. 케이스가 require 로 불러도 같은 객체다 (2026-10-06 이미지 탐침)
export function 감싸기걸기(browser: Browser, 요청도구: APIRequest, 이음값: 이음, baseUrl: string, platform: string): 감싸기 {
  const 원래창: 창만들기 = browser.newContext.bind(browser);
  const 원래요청: 요청만들기 = 요청도구.newContext.bind(요청도구);
  let 지금: 지금부품 | undefined;
  let 걸린: ReadonlyMap<string, RouteHandler> = new Map();

  // Browser.newPage 도 안에서 this.newContext 를 부른다 — 이것 하나로 둘 다 잡힌다. 로그인 상태는 안 옮긴다 — 다른 계정으로 들어가려고 여는 창이다
  browser.newContext = async (options) => {
    const c = await 원래창(options);
    const 부품 = 지금;
    if (부품 === undefined) return c;
    (c as { request: APIRequestContext }).request = 감싼도구(c.request, {
      이음: 이음값, 부품: 부품.부품, 기준: options?.baseURL ?? baseUrl, 대기: 부품.대기, 상태읽기: () => c.storageState(),
      만들때: { ...(options?.extraHTTPHeaders === undefined ? {} : { headers: options.extraHTTPHeaders }), ...(options?.httpCredentials === undefined ? {} : { httpCredentials: options.httpCredentials }) },
    });
    for (const [무늬, handler] of 걸린) await c.route(무늬, handler);
    await 이어주기걸기(c, 이음값, 부품.부품);
    응답듣기(c, 이음값, 부품.부품, 부품.대기);
    부품.직접만든.push(() => c.close());
    return c;
  };

  요청도구.newContext = async (options) => {
    const r = await 원래요청(options);
    const 부품 = 지금;
    if (부품 === undefined) return r;
    부품.직접만든.push(() => r.dispose());
    return 감싼도구(r, {
      이음: 이음값, 부품: 부품.부품, 기준: options?.baseURL ?? baseUrl, 대기: 부품.대기, 상태읽기: () => r.storageState(),
      만들때: { ...(options?.extraHTTPHeaders === undefined ? {} : { headers: options.extraHTTPHeaders }), ...(options?.httpCredentials === undefined ? {} : { httpCredentials: options.httpCredentials }) },
    });
  };

  return {
    async newWindow(state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>, 부품?: 부품상태): Promise<창> {
      걸린 = mocks;
      // 디바이스(화면 크기 · 사용자 에이전트) · baseURL 은 Playwright 가 프로젝트 use 로 채운다 (playwright/lib/index.js runBeforeCreateBrowserContext)
      const context = await 원래창(state === undefined ? {} : { storageState: state });
      const 창request = context.request;
      const 대기: Promise<unknown>[] = [];
      const 직접만든: Array<() => Promise<void>> = [];
      const 부품요청 = 부품 === undefined ? undefined : await 원래요청(state === undefined ? {} : { storageState: state });
      if (부품 !== undefined) {
        // 창을 만든 뒤 request 를 바꿔 끼우면 그 뒤 newPage 의 page.request 도 감싼 것이다 — Page 생성자가 창의 request 를 그대로 받는다
        (context as { request: APIRequestContext }).request = 감싼도구(창request, {
          이음: 이음값, 부품, 기준: baseUrl, 만들때: {}, 대기, 상태읽기: () => context.storageState(),
        });
      }
      for (const [무늬, handler] of mocks) await context.route(무늬, handler);
      if (부품 !== undefined) {
        await 이어주기걸기(context, 이음값, 부품);
        응답듣기(context, 이음값, 부품, 대기);
      }
      const page = await context.newPage();
      let 닫힘 = false;

      return {
        route: async (url, handler) => {
          await context.route(url, handler);
        },
        unroute: (url, handler) => context.unroute(url, handler),
        waitForTimeout: (ms) => page.waitForTimeout(ms),
        // API 부품은 감싸지 않은 창의 request — 진짜 서버에 상태를 심는 뒷문이라 모킹 · 이어 주기를 안 거친다 (SPEC 도메인/시나리오 §3.7 결정 6)
        fetch: (url, options) => 창request.fetch(url, options),
        async runCase(part: CasePart, seq, phase, params) {
          if (부품 === undefined || 부품요청 === undefined) throw new Error('부품 없이 연 창에서 케이스를 돌리려 했다');
          // 같은 케이스를 두 번 쓰면 두 번째 import 는 캐시다. 등록부가 안 지우므로 그대로 꺼내진다
          await import(pathToFileURL(part.filePath ?? '').href);
          const run = 꺼냄(part.tcId);
          if (run === undefined) throw new Error(`${part.filePath ?? '(경로 없음)'} 가 ${part.tcId} 를 등록하지 않았다`);
          지금 = { 부품, 대기, 직접만든 };
          try {
            const outcome = await run({
              page,
              request: 감싼도구(부품요청, { 이음: 이음값, 부품, 기준: baseUrl, 만들때: {}, 대기, 상태읽기: () => 부품요청.storageState() }),
              platform, params, expected: part.expected, skipSteps: part.skipSteps, seq, phase,
            });
            await Promise.allSettled(대기);
            return outcome;
          } finally {
            지금 = undefined;
          }
        },
        state: async () => 합친상태(await context.storageState(), 부품요청 === undefined ? 빈상태 : await 부품요청.storageState()),
        async close() {
          if (닫힘) return;
          닫힘 = true;
          for (const 닫기 of 직접만든) await 닫기().catch(() => undefined);
          await 부품요청?.dispose().catch(() => undefined);
          await context.close().catch(() => undefined);
        },
      };
    },

    // 모을 때의 로그인 상태로 새 연결을 만들어 보낸다 (SPEC 도메인/시나리오 §3.7 결정 12)
    async sendDelete(d) {
      const 연결 = await 원래요청({
        storageState: d.state,
        ...(Object.keys(d.headers).length === 0 ? {} : { extraHTTPHeaders: d.headers }),
        ...(d.httpCredentials === undefined ? {} : { httpCredentials: d.httpCredentials }),
      });
      try {
        return (await 연결.fetch(d.url, { method: 'DELETE' })).status();
      } finally {
        await 연결.dispose();
      }
    },

    되돌리기() {
      browser.newContext = 원래창;
      요청도구.newContext = 원래요청;
    },
  };
}
