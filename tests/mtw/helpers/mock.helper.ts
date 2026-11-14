import type { Page, Route } from '@playwright/test';

export type 풀기 = () => Promise<void>;

export interface 가짜 {
  상태?: number;
  본문?: unknown;
  머리?: Record<string, string>;
  끊기?: boolean;
  늦춤ms?: number;
}

export async function 가짜응답(page: Page, 주소식: RegExp, 응답: 가짜): Promise<풀기> {
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().resourceType() === 'document') return route.fallback();
    if (응답.늦춤ms !== undefined) await new Promise((끝) => setTimeout(끝, 응답.늦춤ms));
    if (응답.끊기 === true) return route.abort('connectionreset');
    if (응답.상태 === undefined && 응답.본문 === undefined) return route.fallback();
    return route.fulfill({
      status: 응답.상태 ?? 200,
      contentType: 'application/json',
      headers: 응답.머리,
      body: JSON.stringify(응답.본문 ?? {}),
    });
  };
  await page.context().route(주소식, 처리);
  return () => page.context().unroute(주소식, 처리);
}

export async function 초기상태바꾸기(page: Page, 바꿀값: Record<string, unknown>, 계정바꿀값: Record<string, unknown> = {}): Promise<풀기> {
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().resourceType() !== 'document' || route.request().method() !== 'GET') return route.fallback();
    const 원래 = await route.fetch({ headers: { ...route.request().headers(), 'accept-language': 'ko-KR,ko;q=0.9' } });
    const html = await 원래.text();
    const 바꾼 = html.replace(/(<script id="initial-state" type="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/, (_전체, 앞: string, 속: string, 뒤: string) => {
      const 상태 = JSON.parse(속) as { meta: Record<string, unknown>; accounts?: Record<string, Record<string, unknown>> };
      Object.assign(상태.meta, 바꿀값);
      const 나 = typeof 상태.meta.me === 'string' ? 상태.accounts?.[상태.meta.me] : undefined;
      if (나 !== undefined) Object.assign(나, 계정바꿀값);
      return `${앞}${JSON.stringify(상태)}${뒤}`;
    });
    return route.fulfill({ response: 원래, body: 바꾼 });
  };
  await page.context().route('**/*', 처리);
  return () => page.context().unroute('**/*', 처리);
}

export async function 서버화면바꾸기(page: Page, 주소식: RegExp, 상태: number, 오류화면경로: string): Promise<풀기> {
  const 처리 = async (route: Route): Promise<void> => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const 오류화면 = await page.request.get(오류화면경로);
    return route.fulfill({ status: 상태, contentType: 'text/html; charset=utf-8', body: await 오류화면.text() });
  };
  await page.context().route(주소식, 처리);
  return () => page.context().unroute(주소식, 처리);
}
