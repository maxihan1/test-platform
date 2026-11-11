import type { Page } from '@playwright/test';

interface 글 {
  id: string;
  media_attachments: unknown[];
}

export async function 토큰(page: Page): Promise<string> {
  const 응답 = await page.request.get('/home');
  const html = await 응답.text();
  const 찾음 = /<script[^>]*id="initial-state"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (찾음 === null) throw new Error(`/home 에서 initial-state 를 찾지 못했다 — 응답 ${응답.status()}`);
  const 상태 = JSON.parse(찾음[1] ?? '{}') as { meta?: { access_token?: string } };
  const 값 = 상태.meta?.access_token;
  if (!값) throw new Error('로그인한 창의 access_token 이 없다');
  return 값;
}

export async function 계정번호(page: Page, 아이디: string): Promise<string> {
  const 응답 = await page.request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(아이디)}`);
  if (!응답.ok()) throw new Error(`계정 ${아이디} 를 찾지 못했다 — ${응답.status()}`);
  return ((await 응답.json()) as { id: string }).id;
}

export async function 글목록(page: Page, 아이디: string): Promise<글[]> {
  const 번호 = await 계정번호(page, 아이디);
  const 응답 = await page.request.get(`/api/v1/accounts/${번호}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`, {
    headers: { Authorization: `Bearer ${await 토큰(page)}` },
  });
  if (!응답.ok()) throw new Error(`${아이디} 글 목록을 읽지 못했다 — ${응답.status()}`);
  return (await 응답.json()) as 글[];
}

export interface 신고옵션 {
  사유?: string;
  게시물?: '미디어' | '아무거나' | '없음';
  분류?: 'spam' | 'other' | 'legal' | 'violation';
}

export async function 신고만들기(신고자창: Page, 대상아이디: string, 옵션: 신고옵션 = {}): Promise<string> {
  const 대상 = await 계정번호(신고자창, 대상아이디);
  let 게시물: string[] = [];
  if ((옵션.게시물 ?? '아무거나') !== '없음') {
    const 글들 = await 글목록(신고자창, 대상아이디);
    const 고른 = 옵션.게시물 === '미디어' ? 글들.find((g) => g.media_attachments.length > 0) : 글들[0];
    if (고른 === undefined) throw new Error(`${대상아이디} 에게 신고할 ${옵션.게시물 ?? '아무거나'} 게시물이 없다`);
    게시물 = [고른.id];
  }
  const 응답 = await 신고자창.request.post('/api/v1/reports', {
    headers: { Authorization: `Bearer ${await 토큰(신고자창)}` },
    data: { account_id: 대상, status_ids: 게시물, comment: 옵션.사유 ?? 'MTO 시험 신고', category: 옵션.분류 ?? 'other', forward: false },
  });
  if (!응답.ok()) throw new Error(`신고를 만들지 못했다 — ${응답.status()} ${await 응답.text()}`);
  return ((await 응답.json()) as { id: string }).id;
}

export async function 신고보내기(신고자창: Page, 대상아이디: string, 사유: string): Promise<number> {
  const 대상 = await 계정번호(신고자창, 대상아이디);
  const 응답 = await 신고자창.request.post('/api/v1/reports', {
    headers: { Authorization: `Bearer ${await 토큰(신고자창)}` },
    data: { account_id: 대상, comment: 사유, category: 'other', forward: false },
  });
  return 응답.status();
}

export async function 글쓰기(page: Page, 내용: string): Promise<string> {
  const 응답 = await page.request.post('/api/v1/statuses', {
    headers: { Authorization: `Bearer ${await 토큰(page)}` },
    data: { status: 내용, visibility: 'unlisted' },
  });
  if (!응답.ok()) throw new Error(`글을 쓰지 못했다 — ${응답.status()}`);
  return ((await 응답.json()) as { id: string }).id;
}

export async function 글지우기(page: Page, 번호: string): Promise<void> {
  await page.request.delete(`/api/v1/statuses/${번호}`, { headers: { Authorization: `Bearer ${await 토큰(page)}` } });
}

export async function 에모지목록(page: Page): Promise<{ shortcode: string; visible_in_picker: boolean }[]> {
  const 응답 = await page.request.get('/api/v1/custom_emojis');
  return (await 응답.json()) as { shortcode: string; visible_in_picker: boolean }[];
}

export function 고유이름(머리: string): string {
  return `${머리}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
