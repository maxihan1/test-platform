// 웹 단계 하나가 탭 · 창에 건 것을 적어 두었다가 단계 끝에 거꾸로 되돌린다 (SPEC 도메인/시나리오 §3.7 결정 3 「단계 끝 되돌리기」 표)
// 창 하나 · 탭 하나로 시나리오 끝까지 돌기 때문이다 — 앞 판(2026-10-06)은 단계마다 새 창이라 샌 것이 창과 함께 버려졌다

import type { BrowserContext, Page, PlaywrightTestOptions, ViewportSize } from '@playwright/test';

import { 남김 } from './parts.js';
import { 기준풀기 } from './tool.js';

// 되돌릴 처음 값 — 프로젝트 use 값이다. Playwright 가 창을 만들 때 이 값으로 채운다(playwright/lib/index.js runBeforeCreateBrowserContext).
// 시간 한도는 Playwright 가 창마다 actionTimeout || 0 으로 건다(Browser._setupBrowserContext). 탭 크기는 창을 열 때 읽은 값이다
export type 창처음값 = Partial<Pick<PlaywrightTestOptions,
  'extraHTTPHeaders' | 'offline' | 'geolocation' | 'permissions' | 'colorScheme' | 'reducedMotion' | 'forcedColors' | 'contrast' | 'actionTimeout' | 'navigationTimeout'
>> & { viewport?: ViewportSize | null };

type 함수 = (...args: unknown[]) => unknown;
type 칸 = '창머리' | '탭머리' | '망' | '위치' | '권한' | '화면' | '미디어' | '한도' | '시계' | '모킹';

// 떼기(Disposable)를 돌려준다 — Playwright 1.63. routeWebSocket · routeFromHAR 는 안 돌려줘 표 밖이다
const 떼기있음 = new Set(['addInitScript', 'exposeFunction', 'exposeBinding', 'route']);
const 듣기 = new Set(['on', 'once', 'addListener', 'prependListener', 'prependOnceListener']);
// 권한 지우기도 권한 칸이다 — 처음 권한을 지운 채 끝나면 다음 단계가 못 쓴다
const 탭설정: Record<string, 칸> = { setExtraHTTPHeaders: '탭머리', setViewportSize: '화면', emulateMedia: '미디어', setDefaultTimeout: '한도', setDefaultNavigationTimeout: '한도' };
const 창설정: Record<string, 칸> = {
  setExtraHTTPHeaders: '창머리', setOffline: '망', setGeolocation: '위치', grantPermissions: '권한', clearPermissions: '권한', setDefaultTimeout: '한도', setDefaultNavigationTimeout: '한도',
  // 창의 가로채기를 지우면 시나리오 모킹(결정 6)도 같이 빠진다
  unroute: '모킹', unrouteAll: '모킹',
};

export interface 단계감시 {
  // 케이스에 넘기는 탭. page.context() 도 적는 창을 돌려준다
  page: Page;
  // 단계 끝 — 통과 · 실패 · 건너뜀 모두 부른다. 하나가 실패해도 나머지를 되돌린다
  되돌리기(): Promise<void>;
}

export interface 단계덧 {
  // 섞인 시나리오(결정 13)의 다른 애플리케이션 단계 주소. 창의 기준 주소는 만들 때 정해져 바꾸는 공개 API 가 없어
  // page.goto 의 상대 주소를 여기서 풀어 넘긴다 (SPEC 도메인/러너 §5.2 「창 하나로 끝까지」)
  기준?: string;
  // 단계가 창의 가로채기를 지웠을 때 시나리오 모킹을 다시 거는 일 — 모킹 목록은 창을 연 쪽(window.ts)이 쥔다
  모킹다시걸기?: () => Promise<void>;
}

export function 단계감시(page: Page, context: BrowserContext, 처음: 창처음값, 덧: 단계덧 = {}): 단계감시 {
  const { 기준 } = 덧;
  const 되돌릴: Array<() => Promise<unknown>> = [];
  const 건드림 = new Set<칸>();

  const 적는것 = (target: Page | BrowserContext, 설정: Record<string, 칸>, 자기: () => object) => (prop: string, call: 함수): 함수 | undefined => {
    if (떼기있음.has(prop)) {
      return async (...args) => {
        const 떼기 = (await call(...args)) as { dispose(): Promise<void> };
        되돌릴.push(() => 떼기.dispose());
        return 떼기;
      };
    }
    if (듣기.has(prop)) {
      return (event, handler) => {
        call(event, handler);
        되돌릴.push(async () => (target as Page).off(event as 'close', handler as () => void));
        return 자기();
      };
    }
    if (prop === 'addLocatorHandler') {
      return async (locator, ...rest) => {
        await call(locator, ...rest);
        되돌릴.push(() => page.removeLocatorHandler(locator as Parameters<Page['removeLocatorHandler']>[0]));
      };
    }
    const 이칸 = 설정[prop];
    if (이칸 === undefined) return undefined;
    return (...args) => {
      건드림.add(이칸);
      return call(...args);
    };
  };

  // page.clock 과 context.clock 은 같은 것이다. 무엇이든 부르면 건드린 것으로 본다
  const 시계 = new Proxy(context.clock, {
    get(t, prop) {
      const v: unknown = Reflect.get(t, prop, t);
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        건드림.add('시계');
        return (v as 함수).apply(t, args);
      };
    },
  });

  const 감싼값 = (t: object, prop: string | symbol, 적기: ReturnType<typeof 적는것>): unknown => {
    const v: unknown = Reflect.get(t, prop, t);
    if (typeof v !== 'function') return v;
    const call = (v as 함수).bind(t);
    return (typeof prop === 'string' && 적기(prop, call)) || call;
  };

  const 창적기 = 적는것(context, 창설정, () => 창);
  const 창: BrowserContext = new Proxy(context, {
    get(t, prop) {
      if (prop === 'clock') return 시계;
      return 감싼값(t, prop, 창적기);
    },
  });
  const 탭적기 = 적는것(page, 탭설정, () => 탭);
  const 탭: Page = new Proxy(page, {
    get(t, prop) {
      if (prop === 'context') return () => 창;
      if (prop === 'clock') return 시계;
      // 탭의 request 는 탭을 만들 때 굳는다. 창의 request 는 window.ts 가 단계마다 그 단계 것으로 바꿔 끼운다
      if (prop === 'request') return context.request;
      if (prop === 'goto' && 기준 !== undefined) return (url: string, options?: Parameters<Page['goto']>[1]) => t.goto(기준풀기(기준, url), options);
      return 감싼값(t, prop, 탭적기);
    },
  });

  return {
    page: 탭,
    async 되돌리기() {
      const 한다 = async (무엇: string, 일: () => Promise<unknown>) => {
        await 일().catch(남김(`단계 끝 되돌리기 — ${무엇}`));
      };
      // 단계가 연 탭 · 팝업을 닫는다 — 첫 탭만 남긴다. 첫 탭이 닫혔으면 다음 단계가 새로 연다(window.ts)
      for (const p of context.pages()) if (p !== page) await 한다('단계가 연 탭', () => p.close());
      for (const 일 of 되돌릴.reverse()) await 한다('떼기', 일);
      되돌릴.length = 0;
      const 탭있음 = !page.isClosed();
      for (const 이칸 of 건드림) {
        switch (이칸) {
          case '창머리': await 한다('창 머리글', () => context.setExtraHTTPHeaders(처음.extraHTTPHeaders ?? {})); break;
          case '탭머리': if (탭있음) await 한다('탭 머리글', () => page.setExtraHTTPHeaders({})); break;
          case '망': await 한다('망 끊김', () => context.setOffline(처음.offline ?? false)); break;
          case '위치': await 한다('위치', () => context.setGeolocation(처음.geolocation ?? null)); break;
          case '권한':
            await 한다('권한', async () => {
              await context.clearPermissions();
              if (처음.permissions?.length) await context.grantPermissions(처음.permissions);
            });
            break;
          case '화면': if (탭있음 && 처음.viewport) await 한다('탭 크기', () => page.setViewportSize(처음.viewport!)); break;
          case '미디어':
            // null 은 「흉내 없음」이라 창 설정으로 안 돌아간다 — 창 값을 그대로 다시 준다(Playwright 기본값은 창을 만들 때와 같다)
            if (탭있음) {
              await 한다('미디어 흉내', () => page.emulateMedia({
                media: null,
                colorScheme: 처음.colorScheme === undefined ? 'light' : 처음.colorScheme,
                reducedMotion: 처음.reducedMotion === undefined ? 'no-preference' : 처음.reducedMotion,
                forcedColors: 처음.forcedColors === undefined ? 'none' : 처음.forcedColors,
                contrast: 처음.contrast === undefined ? 'no-preference' : 처음.contrast,
              }));
            }
            break;
          case '한도':
            // 탭 값이 창 값을 덮으므로 탭에도 같은 처음 값을 준다 — 탭 칸을 비우는 공개 API 가 없다
            for (const 쪽 of 탭있음 ? [context, page] : [context]) {
              쪽.setDefaultTimeout(처음.actionTimeout || 0);
              쪽.setDefaultNavigationTimeout(처음.navigationTimeout || 0);
            }
            break;
          case '모킹': if (덧.모킹다시걸기) await 한다('모킹 다시 걸기', 덧.모킹다시걸기); break;
          case '시계':
            // 떼는 길이 없다(1.63 에 uninstall 없음). 지금 시각에 흐르게 돌린다 — setSystemTime 이 고정을 풀고 resume 이 진짜 시간으로 흐르게 한다
            await 한다('시계', async () => {
              await context.clock.setSystemTime(Date.now());
              await context.clock.resume();
            });
            break;
        }
      }
      건드림.clear();
    },
  };
}
