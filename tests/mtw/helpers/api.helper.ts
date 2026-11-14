import type { APIResponse, Page } from '@playwright/test';

export interface 글 {
  id: string;
  url: string;
  content: string;
  visibility: string;
  reblogs_count: number;
  favourites_count: number;
  quotes_count?: number;
  pinned?: boolean;
  account: { id: string; acct: string };
}

export interface 계정 {
  id: string;
  acct: string;
  username: string;
  display_name: string;
  note: string;
  locked: boolean;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  created_at: string;
}

export async function 토큰(page: Page): Promise<string> {
  const 상태 = page.locator('#initial-state');
  if ((await 상태.count()) === 0) {
    await page.goto('/home');
    await 상태.waitFor({ state: 'attached' });
  }
  const 글자 = (await 상태.textContent()) ?? '{}';
  const 값 = (JSON.parse(글자) as { meta?: { access_token?: string } }).meta?.access_token;
  if (값 === undefined) throw new Error('웹 앱 초기 상태에 접근 토큰이 없다 — 로그인했는지 확인한다');
  return 값;
}

async function 머리(page: Page): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await 토큰(page)}` };
}

export async function apiGet(page: Page, 경로: string): Promise<APIResponse> {
  return page.request.get(경로, { headers: await 머리(page) });
}

export async function apiPost(page: Page, 경로: string, 본문?: unknown): Promise<APIResponse> {
  return page.request.post(경로, { headers: await 머리(page), ...(본문 === undefined ? {} : { data: 본문 }) });
}

export async function apiPut(page: Page, 경로: string, 본문?: unknown): Promise<APIResponse> {
  return page.request.put(경로, { headers: await 머리(page), ...(본문 === undefined ? {} : { data: 본문 }) });
}

export async function apiDelete(page: Page, 경로: string): Promise<APIResponse> {
  return page.request.delete(경로, { headers: await 머리(page) });
}

export async function 몸<T>(응답: APIResponse): Promise<T> {
  if (!응답.ok()) throw new Error(`API 응답 ${String(응답.status())} — ${응답.url()} — ${(await 응답.text()).slice(0, 200)}`);
  return (await 응답.json()) as T;
}

export async function 글쓰기API(page: Page, 본문: Record<string, unknown>): Promise<글> {
  return 몸<글>(await apiPost(page, '/api/v1/statuses', 본문));
}

export async function 글지우기API(page: Page, id: string): Promise<void> {
  const 응답 = await apiDelete(page, `/api/v1/statuses/${id}`);
  if (!응답.ok() && 응답.status() !== 404) throw new Error(`글 지우기 실패 ${String(응답.status())} — ${id}`);
}

export async function 계정찾기API(page: Page, 아이디: string): Promise<계정> {
  return 몸<계정>(await apiGet(page, `/api/v1/accounts/lookup?acct=${encodeURIComponent(아이디)}`));
}

export async function 내계정API(page: Page): Promise<계정> {
  return 몸<계정>(await apiGet(page, '/api/v1/accounts/verify_credentials'));
}

export async function 글찾기API(page: Page, 아이디: string, 글조각: string): Promise<글> {
  const 그계정 = await 계정찾기API(page, 아이디);
  for (const 고정 of ['&pinned=true', '']) {
    const 목록 = await 몸<글[]>(await apiGet(page, `/api/v1/accounts/${그계정.id}/statuses?limit=40${고정}`));
    const 찾음 = 목록.find((s) => s.content.includes(글조각));
    if (찾음 !== undefined) return 찾음;
  }
  throw new Error(`${아이디} 의 글에서 「${글조각}」을 못 찾았다`);
}

export function 글경로(s: Pick<글, 'url'>): string {
  return new URL(s.url).pathname;
}
