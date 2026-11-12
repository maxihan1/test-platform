import type { APIRequestContext } from '@playwright/test';

import { 계정번호 } from './account.helper.js';
import { 고유이름, 머리 } from './auth.helper.js';

const 작은그림 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const 푸시키 = 'BKOT4pU-PEyzaxi9N9F4DjydyYyamAkBiLTUJLgLiI8o_eJr3AavG6FUZcQpWjZ2FLsDmI-gix1j4m40cJ46nJ0';
const 푸시인증 = 'W_9NQj_JxCo0DtHKXERT9w';

export interface 만든필터 {
  id: string;
  키워드: string;
}

async function 번호(응답: { status(): number; json(): Promise<unknown> }): Promise<string> {
  if (응답.status() !== 200 && 응답.status() !== 202) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export function 그림파일(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'mti.png', mimeType: 'image/png', buffer: 작은그림 };
}

export async function 이름으로번호(request: APIRequestContext, 토큰: string, 경로: string, 이름: string): Promise<string> {
  const 응답 = await request.get(경로, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  const 줄들 = (await 응답.json()) as { id?: string; title?: string; phrase?: string }[];
  return 줄들.find((줄) => 줄.title === 이름 || 줄.phrase === 이름)?.id ?? '';
}

export async function 목록만들기(request: APIRequestContext, 토큰: string): Promise<string> {
  return 번호(await request.post('/api/v1/lists', { headers: 머리(토큰), data: { title: 고유이름('MTI 목록 ') } }));
}

export async function 목록지우기(request: APIRequestContext, 토큰: string, 목록: string): Promise<void> {
  if (목록 !== '') await request.delete(`/api/v1/lists/${목록}`, { headers: 머리(토큰) });
}

export async function 필터만들기(request: APIRequestContext, 토큰: string): Promise<만든필터> {
  const 응답 = await request.post('/api/v2/filters', {
    headers: 머리(토큰),
    data: { title: 고유이름('MTI 필터 '), context: ['home'], filter_action: 'warn', keywords_attributes: [{ keyword: 고유이름('mti낱말'), whole_word: false }] },
  });
  if (응답.status() !== 200) return { id: '', 키워드: '' };
  const 몸 = (await 응답.json()) as { id?: string; keywords?: { id?: string }[] };
  return { id: 몸.id ?? '', 키워드: 몸.keywords?.[0]?.id ?? '' };
}

export async function 필터지우기(request: APIRequestContext, 토큰: string, 필터: string): Promise<void> {
  if (필터 !== '') await request.delete(`/api/v2/filters/${필터}`, { headers: 머리(토큰) });
}

export async function 필터글더하기(request: APIRequestContext, 토큰: string, 필터: string, 글: string): Promise<string> {
  return 번호(await request.post(`/api/v2/filters/${필터}/statuses`, { headers: 머리(토큰), data: { status_id: 글 } }));
}

export async function 키워드번호(request: APIRequestContext, 토큰: string, 필터: string): Promise<string> {
  const 응답 = await request.get(`/api/v2/filters/${필터}/keywords`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }[])[0]?.id ?? '';
}

export async function 옛필터만들기(request: APIRequestContext, 토큰: string): Promise<string> {
  return 번호(await request.post('/api/v1/filters', { headers: 머리(토큰), data: { phrase: 고유이름('mti옛낱말'), context: ['home'] } }));
}

export async function 옛필터지우기(request: APIRequestContext, 토큰: string, 필터: string): Promise<void> {
  if (필터 !== '') await request.delete(`/api/v1/filters/${필터}`, { headers: 머리(토큰) });
}

export async function 컬렉션만들기(request: APIRequestContext, 토큰: string): Promise<string> {
  const 응답 = await request.post('/api/v1/collections', {
    headers: 머리(토큰),
    data: { name: 고유이름('MTI 묶음 ').slice(0, 30), description: 'MTI 시험 컬렉션', sensitive: false, discoverable: false },
  });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { collection?: { id?: string } }).collection?.id ?? '';
}

export async function 컬렉션지우기(request: APIRequestContext, 토큰: string, 컬렉션: string): Promise<void> {
  if (컬렉션 !== '') await request.delete(`/api/v1/collections/${컬렉션}`, { headers: 머리(토큰) });
}

export async function 첫컬렉션번호(request: APIRequestContext, 이름: string): Promise<string> {
  const 계정 = await 계정번호(request, 이름);
  const 응답 = await request.get(`/api/v1/accounts/${계정}/collections`);
  if (응답.status() !== 200) return '';
  const 몸 = (await 응답.json()) as { collections?: { id?: string }[] };
  return 몸.collections?.[0]?.id ?? '';
}

export async function 미디어올리기(request: APIRequestContext, 토큰: string): Promise<string> {
  return 번호(await request.post('/api/v1/media', { headers: 머리(토큰), multipart: { file: 그림파일(), description: 'MTI 시험 그림' } }));
}

export async function 미디어지우기(request: APIRequestContext, 토큰: string, 미디어: string): Promise<void> {
  if (미디어 !== '') await request.delete(`/api/v1/media/${미디어}`, { headers: 머리(토큰) });
}

export function 푸시구독내용(종류: Record<string, boolean> = { mention: true }): Record<string, unknown> {
  return {
    subscription: { endpoint: `https://push.example.invalid/mti/${고유이름('s')}`, keys: { p256dh: 푸시키, auth: 푸시인증 } },
    data: { alerts: 종류 },
  };
}

export async function 푸시구독만들기(request: APIRequestContext, 토큰: string): Promise<string> {
  return 번호(await request.post('/api/v1/push/subscription', { headers: 머리(토큰), data: 푸시구독내용() }));
}

export async function 푸시구독지우기(request: APIRequestContext, 토큰: string): Promise<void> {
  await request.delete('/api/v1/push/subscription', { headers: 머리(토큰) });
}

export async function 추천태그만들기(request: APIRequestContext, 토큰: string, 이름 = 고유이름('mti추천')): Promise<string> {
  return 번호(await request.post('/api/v1/featured_tags', { headers: 머리(토큰), data: { name: 이름 } }));
}

export async function 추천태그지우기(request: APIRequestContext, 토큰: string, 태그: string): Promise<void> {
  if (태그 !== '') await request.delete(`/api/v1/featured_tags/${태그}`, { headers: 머리(토큰) });
}
