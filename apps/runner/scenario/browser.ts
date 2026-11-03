// 브라우저 창에 거는 것 — 단계의 이어 주기 가로채기 · 가리킨 응답 적기 · 단계 request 쿠키 더하기 · 섞인 시나리오의 기준 주소 칸 (SPEC 도메인/러너 §5.2)

import type { APIRequestContext, BrowserContext, Page, Route } from '@playwright/test';

import { 가르기, 적기, type 부품상태, type 이음 } from './links.js';
import { 쿠키열쇠 } from './parts.js';
import { 읽어둠 } from './tool.js';

export type 떼기 = { dispose(): Promise<void> };

// 창의 브라우저 요청에 이어 주기를 건다. 모킹보다 나중에 걸어야 먼저 돈다(Playwright 는 나중 route 가 먼저). 손 안 대면 fallback —
// continue 는 먼저 건 모킹을 건너뛰고 진짜 서버로 간다. 오류면 abort — 그냥 보내면 막으려던 준비가 서버를 바꾼다.
// route 가 이미 맞춘 무늬를 가르기에 넘긴다 — 손으로 옮긴 무늬 맞추기가 갈라 조용히 안 걸리지 않게 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
// 돌려받은 떼기로 단계 끝에 뗀다 — 창을 다음 단계가 이어 쓴다
export async function 이어주기걸기(context: BrowserContext, 이음값: 이음, 부품: 부품상태): Promise<떼기[]> {
  // 거꾸로 건다 — Playwright 는 나중 route 를 먼저 돌리므로, 한 주소에 두 무늬가 맞을 때 API 쪽처럼 앞 링크가 이긴다
  const 무늬들 = [...new Set(부품.links.flatMap((link) => (link.kind === 'bind' ? [] : [link.urlPattern])))].reverse();
  const 뗄것: 떼기[] = [];
  for (const 무늬 of 무늬들) {
    뗄것.push(await context.route(무늬, async (route: Route) => {
      const req = route.request();
      const 가름 = await 가르기(이음값, 부품, 'browser', req.method(), req.url(), 무늬);
      if (가름.kind === 'fulfill') await route.fulfill({ status: 가름.응답.status, contentType: 가름.응답.contentType, body: 가름.응답.body });
      else if (가름.kind === 'fail') await route.abort();
      else if (가름.kind === 'send' && 가름.url !== undefined) await route.fallback({ url: 가름.url, ...(가름.method === undefined ? {} : { method: 가름.method }) });
      else await route.fallback();
    }));
  }
  return 뗄것;
}

// 가리킨 부품이면 창의 응답을 적는다. 자리는 오는 순간 잡는다. 3xx 는 본문을 못 읽어 자리만 차지하므로 건너뛴다 (SPEC 도메인/시나리오 §3.7 결정 12 「요청 고르기」)
// 돌려준 함수로 듣기를 끈다 — 단계 끝에 떼야 다음 단계 응답이 이 단계 자리에 안 적힌다
export function 응답듣기(context: BrowserContext, 이음값: 이음, 부품: 부품상태): () => void {
  if (!이음값.가리킴.some((g) => g.fromSeq === 부품.seq)) return () => {};
  const 들음 = (res: Awaited<ReturnType<Page['waitForResponse']>>) => {
    if (res.status() >= 300 && res.status() < 400) return;
    적기(이음값, 부품.seq, res.request().method(), res.url(), () => 읽어둠(res));
  };
  context.on('response', 들음);
  return () => {
    context.off('response', 들음);
  };
}

// 단계 request 의 쿠키를 창에 더한다. 같은 쿠키가 둘에 있으면 창 쪽 — 합친상태와 같은 규칙이다 (SPEC 도메인/시나리오 §3.7 결정 3).
// 창은 쿠키만 읽는다 — storageState 는 모든 출처의 localStorage 까지 떠서 단계마다 부르기에 무겁다
export async function 쿠키더하기(context: BrowserContext, 요청: APIRequestContext): Promise<void> {
  const 있음 = new Set((await context.cookies()).map(쿠키열쇠));
  const 더할 = (await 요청.storageState()).cookies.filter((c) => !있음.has(쿠키열쇠(c)));
  if (더할.length > 0) await context.addCookies(더할);
}

// 주소 맞추기(waitForURL · toHaveURL · waitForRequest …)가 읽는 클라이언트 쪽 기준 주소 칸(context._options.baseURL). 서버 쪽 처음 값은 못 바꾼다.
// 내부 칸이라 판을 올릴 때 깨질 수 있다 — 섞인 시나리오 브라우저 실측(e2e.test)이 지킨다 (SPEC 도메인/러너 §5.2 「창 하나로 끝까지」)
type 기준칸 = { _options?: { baseURL?: string } };
export function 기준읽기(context: BrowserContext): string | undefined {
  return (context as unknown as 기준칸)._options?.baseURL;
}
export function 기준바꾸기(context: BrowserContext, 주소: string | undefined): void {
  const 칸 = (context as unknown as 기준칸)._options;
  if (칸 !== undefined) 칸.baseURL = 주소;
}
