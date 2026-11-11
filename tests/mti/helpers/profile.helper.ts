import type { APIRequestContext } from '@playwright/test';

import { 고유이름, 머리 } from './auth.helper.js';
import type { 앱정보 } from './auth.helper.js';

const 이메일도메인 = '@maxihan.com';
const 짝맞춤코드 = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

export interface 추가정보 {
  name: string;
  value: string;
}

export interface 프로필 {
  id: string;
  display_name: string;
  note: string;
  fields: 추가정보[];
  avatar_description: string;
  header_description: string;
  show_media: boolean;
  show_media_replies: boolean;
  show_featured: boolean;
}

export async function 프로필읽기(request: APIRequestContext, 토큰: string): Promise<프로필> {
  const 빈것: 프로필 = {
    id: '',
    display_name: '',
    note: '',
    fields: [],
    avatar_description: '',
    header_description: '',
    show_media: true,
    show_media_replies: true,
    show_featured: true,
  };
  const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(토큰) });
  if (응답.status() !== 200) return 빈것;
  const 몸 = (await 응답.json()) as Partial<프로필> & { source?: { note?: string; fields?: 추가정보[] } };
  return {
    id: 몸.id ?? '',
    display_name: 몸.display_name ?? '',
    note: 몸.source?.note ?? '',
    fields: (몸.source?.fields ?? []).map((칸) => ({ name: 칸.name, value: 칸.value })),
    avatar_description: 몸.avatar_description ?? '',
    header_description: 몸.header_description ?? '',
    show_media: 몸.show_media ?? true,
    show_media_replies: 몸.show_media_replies ?? true,
    show_featured: 몸.show_featured ?? true,
  };
}

export async function 프로필되돌리기(request: APIRequestContext, 토큰: string, 원래: 프로필): Promise<void> {
  if (원래.id === '') return;
  await request.patch('/api/v1/accounts/update_credentials', {
    headers: 머리(토큰),
    data: {
      display_name: 원래.display_name,
      note: 원래.note,
      fields_attributes: 원래.fields,
      avatar_description: 원래.avatar_description,
      header_description: 원래.header_description,
    },
  });
}

export async function 보임설정되돌리기(request: APIRequestContext, 토큰: string, 원래: 프로필): Promise<void> {
  if (원래.id === '') return;
  await request.patch('/api/v1/profile', {
    headers: 머리(토큰),
    data: { show_media: 원래.show_media, show_media_replies: 원래.show_media_replies, show_featured: 원래.show_featured },
  });
}

export function 추가정보만들기(개수: number): 추가정보[] {
  return Array.from({ length: 개수 }, (_, 순번) => ({ name: `시험항목${String(순번 + 1)}`, value: `시험값${String(순번 + 1)}` }));
}

export function 긴글(앞: string, 길이: number): string {
  return (앞 + 'a'.repeat(길이)).slice(0, 길이);
}

export function 긴이메일(이름: string, 길이: number): string {
  return `${긴글(이름, 길이 - 이메일도메인.length)}${이메일도메인}`;
}

export function 가입본문(이름: string, 덧붙임: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    username: 이름,
    email: `${이름}${이메일도메인}`,
    password: 고유이름('Mti-pass-'),
    agreement: true,
    locale: 'ko',
    ...덧붙임,
  };
}

export function 인가주소(앱: 앱정보, 방식 = 'S256'): string {
  const 값 = new URLSearchParams({
    response_type: 'code',
    client_id: 앱.client_id,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    scope: 'read',
    state: 'mti',
    code_challenge: 짝맞춤코드,
    code_challenge_method: 방식,
    lang: 'ko',
  });
  return `/oauth/authorize?${값.toString()}`;
}

export async function 계정동작(
  request: APIRequestContext,
  토큰: string,
  번호: string,
  동작: string,
  데이터: Record<string, unknown> = {},
): Promise<number> {
  if (번호 === '') return 0;
  const 응답 = await request.post(`/api/v1/accounts/${번호}/${동작}`, { headers: 머리(토큰), data: 데이터 });
  return 응답.status();
}

export async function 도메인차단하기(request: APIRequestContext, 토큰: string, 도메인: string): Promise<number> {
  const 응답 = await request.post('/api/v1/domain_blocks', { headers: 머리(토큰), data: { domain: 도메인 } });
  return 응답.status();
}

export async function 도메인차단풀기(request: APIRequestContext, 토큰: string, 도메인: string): Promise<number> {
  const 응답 = await request.delete('/api/v1/domain_blocks', { headers: 머리(토큰), data: { domain: 도메인 } });
  return 응답.status();
}

export async function 관리계정끄기(admin: APIRequestContext, 번호: string): Promise<boolean> {
  if (번호 === '') return false;
  await admin.post(`/api/v1/admin/accounts/${번호}/action`, { data: { type: 'disable' } });
  const 응답 = await admin.get(`/api/v1/admin/accounts/${번호}`);
  if (응답.status() !== 200) return false;
  return ((await 응답.json()) as { disabled?: boolean }).disabled === true;
}

export async function 관리계정켜기(admin: APIRequestContext, 번호: string): Promise<void> {
  if (번호 === '') return;
  await admin.post(`/api/v1/admin/accounts/${번호}/enable`);
}

export async function 잠금바꾸기(request: APIRequestContext, 토큰: string, 잠금: boolean): Promise<number> {
  const 응답 = await request.patch('/api/v1/accounts/update_credentials', { headers: 머리(토큰), data: { locked: 잠금 } });
  return 응답.status();
}
