// 시나리오 창 — Playwright 창 · request 를 만들고 케이스가 쓰는 도구를 감싸 이어 주기 · 뒷정리 미루기를 건다. 판단은 links.ts 가 한다 (SPEC 도메인/러너 §5.2)
// 감싸는 자리는 여기 한 곳이다 — 단계 request · page.request · 케이스가 직접 만든 창과 연결 (2026-10-06 게이트 0 사용자)
// 웹 단계는 창 하나 · 탭 하나를 시나리오 끝까지 같이 쓴다. 단계가 건 것은 revert.ts 가 단계 끝에 되돌린다 (2026-11-03 TMO · 시나리오 §3.7 결정 3)

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { APIRequest, APIRequestContext, Browser, Page } from '@playwright/test';
import type { ScenarioCaseInput } from '@platform/kit/scenario';

import { 기준바꾸기, 기준읽기, 쿠키더하기, 응답듣기, 이어주기걸기 } from './browser.js';
import { 주소의, type CasePart, type 미룬삭제, type 부품상태, type 상태, type 이음 } from './links.js';
import { 다음HAR경로 } from '../src/recordHar.js';
import { 남김, 합친상태, type RouteHandler, type 단계창, type 창 } from './parts.js';
import type { 폰자리 } from './phone.js';
import { 단계감시, type 창처음값 } from './revert.js';
import { 감싼도구, 빈상태, type 도구묶음 } from './tool.js';
import { 꺼냄 } from './wire.js';

type 연결옵션 = Parameters<APIRequest['newContext']>[0];

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
  // 프로젝트 use 의 머리글 · 기본 인증 — 미룬 삭제는 칸을 명시해 보내므로 Playwright 가 기본값을 안 채운다. 그래서 모을 때 정해 둔다
  기본머리?: Record<string, string>;
  기본인증?: 미룬삭제['httpCredentials'];
  // 앱 · 게임 단계가 같이 쓰는 폰 연결과 게임 단계에 넘길 어드민 키. 앱 단계가 없는 시나리오는 안 연다 (SPEC 도메인/시나리오 §3.7 결정 16)
  폰?: 폰자리;
  adminKey?: { header: string; value: string };
  // 단계가 머리글 · 망 · 흉내를 바꿨을 때 되돌릴 프로젝트 use 값 (SPEC 도메인/시나리오 §3.7 결정 3 「단계 끝 되돌리기」)
  처음?: 창처음값;
}

// 단계 쪽 — 웹 단계는 그 창의 page, 앱 · 게임 단계는 폰 연결. 케이스 파일을 import 한 뒤에 부른다(폰 여는 함수가 그때 오른다)
type 단계쪽 = () => Promise<Pick<ScenarioCaseInput, 'page' | 'driver' | 'game' | 'adminKey' | 'platform'>>;

// 미룬 삭제에 다시 실을 머리글 · 기본 인증. Playwright 와 같은 규칙이다 — 그 도구를 만들 때 그 칸을 안 줬을 때만 프로젝트 기본값을 쓴다
// (playwright/lib/index.js runBeforeCreateRequestContext 의 `key in options`). 칸을 준 연결에 기본값을 깔면 다른 계정으로 나간다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
export function 만들때값(options: 연결옵션, 설정: 감싸기설정): 도구묶음['만들때'] {
  return {
    headers: options !== undefined && 'extraHTTPHeaders' in options ? options.extraHTTPHeaders : 설정.기본머리,
    httpCredentials: options !== undefined && 'httpCredentials' in options ? options.httpCredentials : 설정.기본인증,
  };
}

// 창 · 연결의 기본 주소는 Playwright 가 프로젝트 설정(시작 애플리케이션)으로 채운다. 다른 애플리케이션 단계면 그 단계 주소를 먼저 준다.
// 케이스가 직접 만드는 창 · 연결도 같다 — 안 그러면 다른 애플리케이션 단계의 상대 주소가 시작 애플리케이션으로 간다 (SPEC 도메인/시나리오 §3.7 결정 13)
export function 주소채움<T extends object | undefined>(options: T, 이음값: 이음, 부품: 부품상태 | undefined): T {
  const 주소 = 부품 === undefined ? undefined : 이음값.부품주소.get(부품.seq);
  return 주소 === undefined || (options as { baseURL?: string } | undefined)?.baseURL !== undefined ? options : ({ ...options, baseURL: 주소 } as T);
}

// 시나리오 동안 브라우저의 창 만들기와 @playwright/test 의 연결 만들기를 감싼다. 케이스가 require 로 불러도 같은 객체다 (2026-10-06 이미지 탐침)
export function 감싸기걸기(browser: Browser, 요청도구: APIRequest, 이음값: 이음, 설정: 감싸기설정) {
  const 원래창열기 = browser.newContext.bind(browser);
  // 성능 녹화 — 러너가 폴더를 주면 창마다 HAR 를 건다. 창이 열리는 길은 모두 이 함수를 지난다. 파일은 창을 닫을 때 써진다
  let 준번호 = 0;
  const 원래창: typeof 원래창열기 = (options) => {
    const 폴더 = process.env.PLATFORM_RECORD_HAR_DIR;
    if (!폴더 || options?.recordHar !== undefined) return 원래창열기(options);
    const path = 다음HAR경로(폴더, 준번호);
    준번호 = Number(basename(path, '.har'));
    return 원래창열기({ ...options, recordHar: { path, content: 'embed' } });
  };
  const 원래요청 = 요청도구.newContext.bind(요청도구);
  let 지금: 지금부품 | undefined;
  let 걸린: ReadonlyMap<string, RouteHandler> = new Map();

  const 묶음 = (부품: 부품상태 | undefined, 상태읽기: () => Promise<상태>, options?: 연결옵션): 도구묶음 => ({
    부품, 상태읽기, 기준: options?.baseURL ?? (부품 === undefined ? 설정.baseUrl : 주소의(이음값, 부품.seq)), 만들때: 만들때값(options, 설정),
  });

  // 한도에 걸린 부품이 늦게 만든 것은 받자마자 닫는다
  const 늦은것 = async (닫기: () => Promise<void>): Promise<never> => {
    await 닫기().catch(남김('한도에 걸린 부품이 늦게 만든 창 · 연결을 못 닫았다'));
    throw new Error('단계 제한 시간이 지난 단계가 창 · 연결을 새로 만들려 했다');
  };

  // Browser.newPage 도 안에서 this.newContext 를 부른다 — 이것 하나로 둘 다 잡힌다. 로그인 상태는 안 옮긴다 — 다른 계정으로 들어가려고 여는 창이다
  browser.newContext = async (options) => {
    const c = await 원래창(주소채움(options, 이음값, 지금?.부품));
    const 부품 = 지금;
    if (부품 === undefined) return c;
    if (부품.닫힘) return 늦은것(() => c.close());
    // 바로 목록에 올린다 — 아래 await 사이에 부품 창이 닫혀도 같이 닫히게
    부품.직접만든.push(() => c.close());
    (c as { request: APIRequestContext }).request = 감싼도구(c.request, 이음값, 묶음(부품.부품, () => c.storageState(), options));
    for (const [무늬, handler] of 걸린) await c.route(무늬, handler);
    await 이어주기걸기(c, 이음값, 부품.부품);
    응답듣기(c, 이음값, 부품.부품);
    return c;
  };

  요청도구.newContext = async (options) => {
    const r = await 원래요청(주소채움(options, 이음값, 지금?.부품));
    const 부품 = 지금;
    if (부품 === undefined) return r;
    if (부품.닫힘) return 늦은것(() => r.dispose());
    부품.직접만든.push(() => r.dispose());
    return 감싼도구(r, 이음값, 묶음(부품.부품, () => r.storageState(), options));
  };

  // 웹 단계 · 앱 단계가 같이 쓴다. 부품 request 를 감싸 값 꽂기용 응답 적기 · 뒷정리 미루기를 거는 것은 둘이 같다 (SPEC 도메인/러너 §5.2 「앱 · 게임 단계」)
  const 케이스돌리기 = async (
    part: CasePart, 이번: 지금부품, 부품요청: APIRequestContext, 쪽: 단계쪽,
    seq: number, phase: ScenarioCaseInput['phase'], params: Record<string, unknown>,
  ) => {
    // 같은 케이스를 두 번 쓰면 두 번째 import 는 캐시다. 등록부가 안 지우므로 그대로 꺼내진다
    await import(pathToFileURL(part.filePath ?? '').href);
    const run = 꺼냄(part.tcId);
    if (run === undefined) throw new Error(`${part.filePath ?? '(경로 없음)'} 가 ${part.tcId} 를 등록하지 않았다`);
    const 받은쪽 = await 쪽();
    지금 = 이번;
    try {
      const outcome = await run({
        ...받은쪽,
        request: 감싼도구(부품요청, 이음값, 묶음(이번.부품, () => 부품요청.storageState())),
        params, expected: part.expected, skipSteps: part.skipSteps, seq, phase,
        apiAuths: part.apiAuths ?? [],
        // 그 부품 판으로 응답 모양을 본다. 없으면 안 본다 (도메인/API §3.8 「응답 모양 확인」)
        ...(part.apiDocFile !== undefined && { apiDoc: JSON.parse(readFileSync(part.apiDocFile, 'utf8')) as unknown }),
        tokenRequest: 부품요청,
      });
      // 창을 닫으면 본문을 못 읽는다 — 이 부품이 잡은 자리를 다 읽을 때까지 기다린다(부품 한도 경주 안). 자리는 못 읽으면 사유 글자라 던지지 않는다
      await Promise.all(이음값.응답.values());
      return outcome;
    } finally {
      지금 = undefined;
    }
  };

  return {
    // 앱 · 게임 단계 자리 — 창을 안 연다. 폰은 설정의 연결 하나를 같이 쓰고, 단계마다 새로 만드는 것은 그 단계 request 뿐이다 (SPEC 도메인/시나리오 §3.7 결정 16)
    async appWindow(부품: 부품상태, state: 상태): Promise<단계창> {
      const 이번: 지금부품 = { 부품, 직접만든: [], 닫힘: false };
      const 부품요청 = await 원래요청(주소채움({ storageState: state }, 이음값, 부품));
      let 닫음 = false;
      const 폰쪽: 단계쪽 = async () => {
        if (설정.폰 === undefined) throw new Error('이 실행에는 폰 연결이 없다');
        const { driver, game } = await 설정.폰.얻기();
        return { driver, ...(game && { game }), ...(설정.adminKey && { adminKey: 설정.adminKey }), platform: 'android' };
      };
      return {
        runCase: (part, seq, phase, params) => 케이스돌리기(part, 이번, 부품요청, 폰쪽, seq, phase, params),
        state: () => 부품요청.storageState(),
        async close() {
          if (닫음) return;
          닫음 = true;
          이번.닫힘 = true;
          for (const 닫기 of 이번.직접만든) await 닫기().catch(남김('케이스가 직접 만든 창 · 연결을 못 닫았다'));
          await 부품요청.dispose().catch(남김('부품 request 를 못 닫았다'));
        },
      };
    },

    // 시나리오를 시작할 때 한 번 연다. 모킹은 mock 부품이 이 창에 걸고 시나리오 끝까지 둔다 — mocks 는 케이스가 직접 만드는 창에 다시 걸 목록이다
    async newWindow(mocks: ReadonlyMap<string, RouteHandler>): Promise<창> {
      걸린 = mocks;
      // 디바이스(화면 크기 · 사용자 에이전트) · baseURL 은 Playwright 가 프로젝트 use 로 채운다 (playwright/lib/index.js runBeforeCreateBrowserContext)
      const context = await 원래창({});
      const 창request = context.request;
      let 탭 = await context.newPage();
      let 탭죽음 = false;
      const 지켜보기 = (p: Page) => p.once('crash', () => {
        탭죽음 = true;
      });
      지켜보기(탭);
      const 처음: 창처음값 = { ...설정.처음, viewport: 탭.viewportSize() };
      const 처음기준 = 기준읽기(context);
      // 단계가 첫 탭을 닫았거나 탭이 죽었으면 새 탭을 첫 탭으로 삼는다. 로그인 상태는 창에 있어 그대로다(sessionStorage 는 잃는다) (SPEC 도메인/시나리오 §3.7 결정 3 표)
      const 살아있는탭 = async (): Promise<Page> => {
        if (!탭.isClosed() && !탭죽음) return 탭;
        await 탭.close().catch(남김('죽은 탭을 못 닫았다'));
        탭 = await context.newPage();
        탭죽음 = false;
        지켜보기(탭);
        return 탭;
      };
      let 닫음 = false;
      const 창닫기 = async () => {
        if (닫음) return;
        닫음 = true;
        await context.close().catch(남김('시나리오 창을 못 닫았다'));
      };

      return {
        route: async (url, handler) => {
          await context.route(url, handler);
        },
        unroute: (url, handler) => context.unroute(url, handler),
        waitForTimeout: async (ms) => (await 살아있는탭()).waitForTimeout(ms),
        // API 부품은 감싸지 않은 창의 request — 진짜 서버에 상태를 심는 뒷문이라 모킹 · 이어 주기를 안 거친다 (SPEC 도메인/시나리오 §3.7 결정 6)
        fetch: (url, options) => 창request.fetch(url, options),
        // 웹 단계 하나 — 같은 창 · 같은 탭에 그 단계 request · 이어 주기를 걸고, 닫을 때 단계가 건 것을 되돌린다 (SPEC 도메인/러너 §5.2 「창 하나로 끝까지」)
        async 단계(부품: 부품상태, 넘겨받기: boolean): Promise<단계창> {
          const 지금탭 = await 살아있는탭();
          if (!넘겨받기) {
            // 같은 창에서 로그인 상태를 비운다 — 쿠키와 이 창이 연 출처의 localStorage. sessionStorage 는 탭에 붙어 지금 출처 것만 지운다 (SPEC 도메인/시나리오 §3.7 결정 12 「넘겨받기 끔」)
            await context.setStorageState(빈상태);
            if (지금탭.url() !== 'about:blank') await 지금탭.evaluate(() => sessionStorage.clear()).catch(남김('지금 탭의 sessionStorage 를 못 비웠다'));
            // 빈 화면에서 시작한다 — 앞 화면이 메모리에 쥔 로그인으로 돌지 않게. 단독 실행도 빈 탭에서 시작한다
            await 지금탭.goto('about:blank');
          }
          const 단계주소 = 이음값.부품주소.get(부품.seq);
          if (단계주소 !== undefined) 기준바꾸기(context, 단계주소);
          const 이번: 지금부품 = { 부품, 직접만든: [], 닫힘: false };
          // 단계마다 새로 만드는 것은 이것뿐이다. 창의 쿠키를 들고 시작한다 — 로그인 준비를 건너뛰어도 API 요청이 로그인한 사람으로 간다
          const 부품요청 = await 원래요청(주소채움({ storageState: { cookies: await context.cookies(), origins: [] } }, 이음값, 부품));
          // 창의 request 를 바꿔 끼우면 단계 안에서 연 탭 · 팝업의 page.request 도 감싼 것이다 — Page 생성자가 창의 request 를 그대로 받는다
          (context as { request: APIRequestContext }).request = 감싼도구(창request, 이음값, 묶음(부품, () => context.storageState()));
          const 뗄것 = await 이어주기걸기(context, 이음값, 부품);
          const 듣기끔 = 응답듣기(context, 이음값, 부품);
          const 감시 = 단계감시(지금탭, context, 처음, {
            ...(단계주소 !== undefined && { 기준: 단계주소 }),
            // 케이스가 창의 가로채기를 지웠다(unrouteAll · unroute) — 모킹은 시나리오 끝까지 가야 하니 걸린 것을 차례대로 다시 건다. 남은 가로채기는 이때 모킹뿐이다
            모킹다시걸기: async () => {
              await context.unrouteAll();
              for (const [무늬, handler] of 걸린) await context.route(무늬, handler);
            },
          });
          let 끝 = false;
          return {
            runCase: (part: CasePart, seq, phase, params) => 케이스돌리기(part, 이번, 부품요청, async () => ({ page: 감시.page, platform: 설정.platform }), seq, phase, params),
            state: async () => 합친상태(await context.storageState(), await 부품요청.storageState()),
            async close(끊음 = false) {
              if (끝) return;
              끝 = true;
              이번.닫힘 = true;
              for (const 닫기 of 이번.직접만든) await 닫기().catch(남김('케이스가 직접 만든 창 · 연결을 못 닫았다'));
              // 한도에 걸렸다 — 케이스가 아직 이 탭을 쥐고 돈다. 창째 닫아 멈춘다. 시나리오는 여기서 멈추니 다음 단계가 쓸 창이 없어도 된다
              if (끊음) {
                await 부품요청.dispose().catch(남김('단계 request 를 못 닫았다'));
                await 창닫기();
                return;
              }
              await 쿠키더하기(context, 부품요청).catch(남김('단계 request 의 쿠키를 창에 못 더했다'));
              await 부품요청.dispose().catch(남김('단계 request 를 못 닫았다'));
              듣기끔();
              for (const 하나 of 뗄것) await 하나.dispose().catch(남김('이어 주기를 못 뗐다'));
              (context as { request: APIRequestContext }).request = 창request;
              await 감시.되돌리기();
              if (단계주소 !== undefined) 기준바꾸기(context, 처음기준);
            },
          };
        },
        state: () => context.storageState(),
        close: 창닫기,
      };
    },

    // 모을 때의 로그인 상태로 새 연결을 만들어 보낸다. 한도는 parts.ts 가 정해 넘긴다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
    async sendDelete(d: 미룬삭제, 한도: number): Promise<number> {
      const 연결 = await 원래요청({
        storageState: d.state,
        extraHTTPHeaders: d.headers,
        // 없으면 칸을 아예 안 넣는다 — 모을 때 이미 프로젝트 기본값까지 정했다
        ...(d.httpCredentials === undefined ? {} : { httpCredentials: d.httpCredentials }),
      });
      try {
        return (await 연결.fetch(d.url, { ...d.본문, method: 'DELETE', timeout: 한도 })).status();
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
