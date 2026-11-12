import type { APIRequestContext } from '@playwright/test';

import { 계정번호 } from './account.helper.js';
import { 머리 } from './auth.helper.js';

interface 글줄 {
  id: string;
  visibility?: string;
  reblog?: unknown;
  poll?: { id: string } | null;
  in_reply_to_id?: string | null;
}

export async function 글쓰기(request: APIRequestContext, 토큰: string, 내용: Record<string, unknown> = {}): Promise<string> {
  const 응답 = await request.post('/api/v1/statuses', {
    headers: 머리(토큰),
    data: { status: `MTI 시험 글 ${Date.now().toString(36)}`, visibility: 'unlisted', ...내용 },
  });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 글지우기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.delete(`/api/v1/statuses/${번호}`, { headers: 머리(토큰) });
}

async function 공개글들(request: APIRequestContext, 이름: string): Promise<글줄[]> {
  const 계정 = await 계정번호(request, 이름);
  if (계정 === '') return [];
  const 응답 = await request.get(`/api/v1/accounts/${계정}/statuses?exclude_reblogs=true&limit=40`);
  return (await 응답.json()) as 글줄[];
}

export async function 첫공개글(request: APIRequestContext, 이름: string): Promise<string> {
  const 글들 = await 공개글들(request, 이름);
  return 글들.find((글) => 글.visibility === 'public')?.id ?? '';
}

export async function 공개글둘(request: APIRequestContext, 이름: string): Promise<string[]> {
  const 글들 = await 공개글들(request, 이름);
  return 글들.filter((글) => 글.visibility === 'public').slice(0, 2).map((글) => 글.id);
}

export async function 설문번호(request: APIRequestContext, 이름: string): Promise<string> {
  const 글들 = await 공개글들(request, 이름);
  return 글들.find((글) => 글.poll !== null && 글.poll !== undefined)?.poll?.id ?? '';
}

export async function 예약글만들기(request: APIRequestContext, 토큰: string, 며칠뒤 = 40): Promise<string> {
  const 시각 = new Date(Date.now() + 며칠뒤 * 24 * 60 * 60 * 1000).toISOString();
  const 응답 = await request.post('/api/v1/statuses', {
    headers: 머리(토큰),
    data: { status: `MTI 예약 글 ${Date.now().toString(36)}`, visibility: 'direct', scheduled_at: 시각 },
  });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 예약글지우기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.delete(`/api/v1/scheduled_statuses/${번호}`, { headers: 머리(토큰) });
}

export async function 첫번호(request: APIRequestContext, 토큰: string, 경로: string): Promise<string> {
  const 응답 = await request.get(경로, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  const 몸 = (await 응답.json()) as { id?: string }[] | { notification_groups?: { group_key?: string }[] };
  if (Array.isArray(몸)) return 몸[0]?.id ?? '';
  return 몸.notification_groups?.[0]?.group_key ?? '';
}
