import type { APIRequestContext, Page, Response } from '@playwright/test';

export async function 만들어진글지우기(api: APIRequestContext, 응답: Response): Promise<void> {
  if (응답.status() !== 201) return;
  const 글번호 = ((await 응답.json()) as { id: number }).id;
  const 지움 = await api.delete(`/api/posts/${String(글번호)}`);
  if (지움.status() !== 204 && 지움.status() !== 404) throw new Error(`만들어진 글 지우기 실패: ${String(지움.status())}`);
}

export async function 열린글지우기(page: Page): Promise<void> {
  const 맞음 = /^\/board\/(\d+)$/.exec(new URL(page.url()).pathname);
  if (맞음 === null) return;
  const 지움 = await page.request.delete(`/api/posts/${맞음[1] ?? ''}`);
  if (지움.status() !== 204 && 지움.status() !== 404) throw new Error(`만들어진 글 지우기 실패: ${String(지움.status())}`);
}
