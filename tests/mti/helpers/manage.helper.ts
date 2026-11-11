import type { APIRequestContext } from '@playwright/test';

import { 가입하기, 계정번호 } from './account.helper.js';
import { 관리지우기 } from './admin.helper.js';
import { 고유이름, 머리 } from './auth.helper.js';
import { 추천태그만들기, 추천태그지우기 } from './resource.helper.js';
import { 첫공개글 } from './status.helper.js';

export interface 시험태그 {
  이름: string;
  번호: string;
  추천: string;
}

export function 오늘날짜(): string {
  return new Date().toISOString().slice(0, 10);
}

export function 번호비교(앞: string, 뒤: string): number {
  const 차 = BigInt(앞) - BigInt(뒤);
  if (차 < BigInt(0)) return -1;
  return 차 > BigInt(0) ? 1 : 0;
}

export async function 응답번호들(request: APIRequestContext, 경로: string, 토큰 = ''): Promise<string[]> {
  const 응답 = await request.get(경로, { headers: 토큰 === '' ? {} : 머리(토큰) });
  if (응답.status() !== 200) return [];
  const 줄들 = (await 응답.json()) as { id?: string }[];
  return 줄들.map((줄) => String(줄.id ?? ''));
}

export async function 글주소(request: APIRequestContext, 번호: string): Promise<string> {
  if (번호 === '') return '';
  const 응답 = await request.get(`/api/v1/statuses/${번호}`);
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { url?: string }).url ?? '';
}

export async function 팔로워글번호(request: APIRequestContext, 토큰: string, 이름: string): Promise<string> {
  const 계정 = await 계정번호(request, 이름);
  if (계정 === '') return '';
  const 응답 = await request.get(`/api/v1/accounts/${계정}/statuses?limit=40`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  const 글들 = (await 응답.json()) as { id?: string; visibility?: string }[];
  return 글들.find((글) => 글.visibility === 'private')?.id ?? '';
}

export async function 시험태그만들기(request: APIRequestContext, 토큰: string): Promise<시험태그> {
  const 이름 = 고유이름('mti');
  const 추천 = await 추천태그만들기(request, 토큰, 이름);
  if (추천 === '') return { 이름, 번호: '', 추천: '' };
  const 응답 = await request.get(`/api/v1/tags/${이름}`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return { 이름, 번호: '', 추천 };
  return { 이름, 번호: ((await 응답.json()) as { id?: string }).id ?? '', 추천 };
}

export async function 시험태그지우기(request: APIRequestContext, 토큰: string, 태그: 시험태그): Promise<void> {
  await 추천태그지우기(request, 토큰, 태그.추천);
}

export async function 관리계정조치(admin: APIRequestContext, 번호: string, 종류: string): Promise<void> {
  if (번호 === '') return;
  await admin.post(`/api/v1/admin/accounts/${번호}/action`, { data: { type: 종류 } });
}

export async function 관리신고조작(admin: APIRequestContext, 신고: string, 동작: string): Promise<void> {
  if (신고 === '') return;
  await admin.post(`/api/v1/admin/reports/${신고}/${동작}`);
}

export async function 승인대기계정만들기(request: APIRequestContext, admin: APIRequestContext): Promise<string> {
  const 응답 = await admin.post('/api/v1/admin/email_domain_blocks', { data: { domain: 'maxihan.com', allow_with_approval: true } });
  if (응답.status() !== 200) return '';
  const 차단 = ((await 응답.json()) as { id?: string }).id ?? '';
  try {
    return (await 가입하기(request)).username;
  } finally {
    await 관리지우기(admin, '/api/v1/admin/email_domain_blocks', 차단);
  }
}

export async function 비동기갱신번호(request: APIRequestContext, 토큰: string): Promise<string> {
  const 글 = await 첫공개글(request, 'hana_photo');
  if (글 === '') return '';
  const 응답 = await request.get(`/api/v1/statuses/${글}/context`, { headers: 머리(토큰) });
  const 값 = 응답.headers()['mastodon-async-refresh'] ?? '';
  return /id="([^"]+)"/.exec(값)?.[1] ?? '';
}
