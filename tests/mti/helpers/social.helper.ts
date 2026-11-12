import type { APIRequestContext } from '@playwright/test';

import { 고유이름, 머리 } from './auth.helper.js';

export interface 읽은위치 {
  home: string;
  notifications: string;
}

export interface 알림설정 {
  [칸: string]: unknown;
}

const 검증접두 = '데이터 검증에 실패하였습니다. ';

async function 쉬기(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
}

export function 검증문구(오류: unknown): string {
  const 글 = typeof 오류 === 'string' ? 오류 : '';
  return 글.startsWith(검증접두) ? 글.slice(검증접두.length) : 글;
}

export function 한글글자(길이: number): string {
  return '가'.repeat(길이);
}

export async function 인기링크주소(request: APIRequestContext): Promise<string> {
  const 응답 = await request.get('/api/v1/trends/links');
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { url?: string }[])[0]?.url ?? '';
}

export async function 내계정이름(request: APIRequestContext, 토큰: string): Promise<string> {
  const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { acct?: string }).acct ?? '';
}

export async function 쪽지보내기(request: APIRequestContext, 보낸토큰: string, 받는이름: string): Promise<string> {
  const 응답 = await request.post('/api/v1/statuses', {
    headers: 머리(보낸토큰),
    data: { status: `@${받는이름} MTI 대화 시험 ${Date.now().toString(36)}`, visibility: 'direct' },
  });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 대화번호찾기(request: APIRequestContext, 토큰: string, 글번호: string): Promise<string> {
  if (글번호 === '') return '';
  for (let 회 = 0; 회 < 20; 회 += 1) {
    const 응답 = await request.get('/api/v1/conversations?limit=40', { headers: 머리(토큰) });
    if (응답.status() === 200) {
      const 줄들 = (await 응답.json()) as { id?: string; last_status?: { id?: string } | null }[];
      const 찾음 = 줄들.find((줄) => 줄.last_status?.id === 글번호);
      if (찾음?.id) return 찾음.id;
    }
    await 쉬기();
  }
  return '';
}

export async function 대화지우기(request: APIRequestContext, 토큰: string, 대화: string): Promise<void> {
  if (대화 === '') return;
  await request.delete(`/api/v1/conversations/${대화}`, { headers: 머리(토큰) });
}

export async function 즐겨찾기하기(request: APIRequestContext, 토큰: string, 글번호: string): Promise<number> {
  if (글번호 === '') return 0;
  const 응답 = await request.post(`/api/v1/statuses/${글번호}/favourite`, { headers: 머리(토큰) });
  return 응답.status();
}

export async function 알림번호찾기(request: APIRequestContext, 토큰: string, 글번호: string): Promise<string> {
  if (글번호 === '') return '';
  for (let 회 = 0; 회 < 20; 회 += 1) {
    const 응답 = await request.get('/api/v1/notifications?limit=40', { headers: 머리(토큰) });
    if (응답.status() === 200) {
      const 줄들 = (await 응답.json()) as { id?: string; status?: { id?: string } | null }[];
      const 찾음 = 줄들.find((줄) => 줄.status?.id === 글번호);
      if (찾음?.id) return 찾음.id;
    }
    await 쉬기();
  }
  return '';
}

export async function 알림묶음키찾기(request: APIRequestContext, 토큰: string, 글번호: string): Promise<string> {
  if (글번호 === '') return '';
  for (let 회 = 0; 회 < 20; 회 += 1) {
    const 응답 = await request.get('/api/v2/notifications?limit=40', { headers: 머리(토큰) });
    if (응답.status() === 200) {
      const 묶음들 = ((await 응답.json()) as { notification_groups?: { group_key?: string; status_id?: string | null }[] }).notification_groups ?? [];
      const 찾음 = 묶음들.find((묶음) => 묶음.status_id === 글번호);
      if (찾음?.group_key) return 찾음.group_key;
    }
    await 쉬기();
  }
  return '';
}

export async function 읽은위치읽기(request: APIRequestContext, 토큰: string): Promise<읽은위치> {
  const 응답 = await request.get('/api/v1/markers?timeline[]=home&timeline[]=notifications', { headers: 머리(토큰) });
  if (응답.status() !== 200) return { home: '', notifications: '' };
  const 몸 = (await 응답.json()) as { home?: { last_read_id?: string }; notifications?: { last_read_id?: string } };
  return { home: 몸.home?.last_read_id ?? '', notifications: 몸.notifications?.last_read_id ?? '' };
}

export async function 읽은위치돌리기(request: APIRequestContext, 토큰: string, 처음: 읽은위치): Promise<void> {
  const 자료: Record<string, { last_read_id: string }> = {};
  if (처음.home !== '') 자료.home = { last_read_id: 처음.home };
  if (처음.notifications !== '') 자료.notifications = { last_read_id: 처음.notifications };
  if (Object.keys(자료).length === 0) return;
  await request.post('/api/v1/markers', { headers: 머리(토큰), data: 자료 });
}

export async function 알림설정읽기(request: APIRequestContext, 토큰: string): Promise<알림설정> {
  const 응답 = await request.get('/api/v2/notifications/policy', { headers: 머리(토큰) });
  if (응답.status() !== 200) return {};
  const 몸 = (await 응답.json()) as 알림설정;
  const 칸들 = ['for_not_following', 'for_not_followers', 'for_new_accounts', 'for_private_mentions', 'for_limited_accounts', 'for_bots'];
  const 값: 알림설정 = {};
  for (const 칸 of 칸들) 값[칸] = 몸[칸];
  return 값;
}

export async function 알림설정돌리기(request: APIRequestContext, 토큰: string, 처음: 알림설정): Promise<void> {
  if (Object.keys(처음).length === 0) return;
  await request.patch('/api/v2/notifications/policy', { headers: 머리(토큰), data: 처음 });
}

export async function 태그팔로우(request: APIRequestContext, 토큰: string, 이름: string): Promise<number> {
  const 응답 = await request.post(`/api/v1/tags/${encodeURIComponent(이름)}/follow`, { headers: 머리(토큰) });
  return 응답.status();
}

export async function 태그팔로우취소(request: APIRequestContext, 토큰: string, 이름: string): Promise<void> {
  await request.post(`/api/v1/tags/${encodeURIComponent(이름)}/unfollow`, { headers: 머리(토큰) });
}

export async function 태그추천(request: APIRequestContext, 토큰: string, 이름: string): Promise<number> {
  const 응답 = await request.post(`/api/v1/tags/${encodeURIComponent(이름)}/feature`, { headers: 머리(토큰) });
  return 응답.status();
}

export async function 태그추천취소(request: APIRequestContext, 토큰: string, 이름: string): Promise<void> {
  await request.post(`/api/v1/tags/${encodeURIComponent(이름)}/unfeature`, { headers: 머리(토큰) });
}

export async function 추천태그개수(request: APIRequestContext, 토큰: string): Promise<number> {
  const 응답 = await request.get('/api/v1/featured_tags', { headers: 머리(토큰) });
  if (응답.status() !== 200) return -1;
  return ((await 응답.json()) as unknown[]).length;
}

export async function 추천태그채우기(request: APIRequestContext, 토큰: string, 개수: number): Promise<string[]> {
  const 만든 = [] as string[];
  let 지금 = await 추천태그개수(request, 토큰);
  while (지금 >= 0 && 지금 < 개수) {
    const 응답 = await request.post('/api/v1/featured_tags', { headers: 머리(토큰), data: { name: 고유이름('mti추천') } });
    if (응답.status() !== 200) break;
    만든.push(((await 응답.json()) as { id?: string }).id ?? '');
    지금 += 1;
  }
  return 만든;
}

export async function 추천태그비우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) {
    if (번호 !== '') await request.delete(`/api/v1/featured_tags/${번호}`, { headers: 머리(토큰) });
  }
}

export async function 리스트개수(request: APIRequestContext, 토큰: string): Promise<number> {
  const 응답 = await request.get('/api/v1/lists', { headers: 머리(토큰) });
  if (응답.status() !== 200) return -1;
  return ((await 응답.json()) as unknown[]).length;
}

export async function 리스트채우기(request: APIRequestContext, 토큰: string, 개수: number): Promise<string[]> {
  const 만든 = [] as string[];
  let 지금 = await 리스트개수(request, 토큰);
  while (지금 >= 0 && 지금 < 개수) {
    const 응답 = await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 고유이름('MTI 리스트 ') } });
    if (응답.status() !== 200) break;
    만든.push(((await 응답.json()) as { id?: string }).id ?? '');
    지금 += 1;
  }
  return 만든;
}

export async function 리스트비우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) {
    if (번호 !== '') await request.delete(`/api/v1/lists/${번호}`, { headers: 머리(토큰) });
  }
}

export async function 리스트구성원더하기(request: APIRequestContext, 토큰: string, 리스트: string, 계정: string): Promise<number> {
  if (리스트 === '' || 계정 === '') return 0;
  const 응답 = await request.post(`/api/v1/lists/${리스트}/accounts`, { headers: 머리(토큰), data: { account_ids: [계정] } });
  return 응답.status();
}

export async function 컬렉션개수(request: APIRequestContext, 토큰: string, 계정: string): Promise<number> {
  const 응답 = await request.get(`/api/v1/accounts/${계정}/collections`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return -1;
  return (((await 응답.json()) as { collections?: unknown[] }).collections ?? []).length;
}

export async function 컬렉션채우기(request: APIRequestContext, 토큰: string, 계정: string, 개수: number): Promise<string[]> {
  const 만든 = [] as string[];
  let 지금 = await 컬렉션개수(request, 토큰, 계정);
  while (지금 >= 0 && 지금 < 개수) {
    const 응답 = await request.post('/api/v1/collections', {
      headers: 머리(토큰),
      data: { name: 고유이름('MTI 묶음 ').slice(0, 30), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
    });
    if (응답.status() !== 200) break;
    만든.push(((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '');
    지금 += 1;
  }
  return 만든;
}

export async function 컬렉션비우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) {
    if (번호 !== '') await request.delete(`/api/v1/collections/${번호}`, { headers: 머리(토큰) });
  }
}

export async function 컬렉션항목더하기(request: APIRequestContext, 토큰: string, 컬렉션: string, 계정: string): Promise<string> {
  if (컬렉션 === '' || 계정 === '') return '';
  const 응답 = await request.post(`/api/v1/collections/${컬렉션}/items`, { headers: 머리(토큰), data: { account_id: 계정 } });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { collection_item?: { id?: string } }).collection_item?.id ?? '';
}

export async function 공지반응달기(request: APIRequestContext, 토큰: string, 공지: string, 이모지: string): Promise<number> {
  if (공지 === '') return 0;
  const 응답 = await request.put(`/api/v1/announcements/${공지}/reactions/${encodeURIComponent(이모지)}`, { headers: 머리(토큰) });
  return 응답.status();
}

export async function 공지반응빼기(request: APIRequestContext, 토큰: string, 공지: string, 이모지: string): Promise<void> {
  if (공지 === '') return;
  await request.delete(`/api/v1/announcements/${공지}/reactions/${encodeURIComponent(이모지)}`, { headers: 머리(토큰) });
}

export async function 푸시공개키(request: APIRequestContext): Promise<string> {
  const 응답 = await request.get('/api/v2/instance');
  if (응답.status() !== 200) return '';
  const 몸 = (await 응답.json()) as { configuration?: { vapid?: { public_key?: string } } };
  return 몸.configuration?.vapid?.public_key ?? '';
}

export async function 건드리지않은글낱말(request: APIRequestContext, 토큰: string, 이름: string): Promise<string> {
  const 계정 = await request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(이름)}`);
  if (계정.status() !== 200) return '';
  const 번호 = ((await 계정.json()) as { id?: string }).id ?? '';
  const 응답 = await request.get(`/api/v1/accounts/${번호}/statuses?exclude_reblogs=true&limit=40`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  const 글들 = (await 응답.json()) as {
    visibility?: string;
    favourited?: boolean;
    reblogged?: boolean;
    bookmarked?: boolean;
    content?: string;
    mentions?: unknown[];
    in_reply_to_id?: string | null;
  }[];
  for (const 글 of 글들) {
    if (글.visibility !== 'public' || 글.favourited || 글.reblogged || 글.bookmarked) continue;
    if ((글.mentions ?? []).length > 0 || 글.in_reply_to_id) continue;
    const 낱말 = (글.content ?? '')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .find((조각) => /^[가-힣]{2,}$/.test(조각));
    if (낱말) return 낱말;
  }
  return '';
}

export function 구독주소(내용: Record<string, unknown>): string {
  return (내용 as { subscription?: { endpoint?: string } }).subscription?.endpoint ?? '';
}

export async function 팔로우중계정들(request: APIRequestContext, 토큰: string, 계정: string): Promise<string[]> {
  const 응답 = await request.get(`/api/v1/accounts/${계정}/following?limit=80`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return [];
  return ((await 응답.json()) as { id?: string }[]).map((줄) => 줄.id ?? '').filter((번호) => 번호 !== '');
}
