import type { APIRequestContext } from '@playwright/test';

import { 고유이름, 머리, 앱만들기, 앱토큰받기 } from './auth.helper.js';

export interface 가입계정 {
  username: string;
  token: string;
}

export async function 계정번호(request: APIRequestContext, 이름: string): Promise<string> {
  const 응답 = await request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(이름)}`);
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 내번호(request: APIRequestContext, 토큰: string): Promise<string> {
  const 응답 = await request.get('/api/v1/accounts/verify_credentials', { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 관계(request: APIRequestContext, 토큰: string, 상대: string): Promise<Record<string, unknown>> {
  const 응답 = await request.get(`/api/v1/accounts/relationships?id[]=${상대}`, { headers: 머리(토큰) });
  const 줄들 = (await 응답.json()) as Record<string, unknown>[];
  return 줄들[0] ?? {};
}

export async function 가입하기(request: APIRequestContext, 덧붙임: Record<string, unknown> = {}): Promise<가입계정> {
  const 앱 = await 앱만들기(request, 'read write follow push');
  const 앱토큰 = await 앱토큰받기(request, 앱, 'read write follow push');
  const username = 고유이름('mti_');
  const 응답 = await request.post('/api/v1/accounts', {
    headers: 머리(앱토큰),
    data: { username, email: `${username}@maxihan.com`, password: 고유이름('Mti-pass-'), agreement: true, locale: 'ko', ...덧붙임 },
  });
  const 몸 = (await 응답.json()) as { access_token?: string };
  return { username, token: 몸.access_token ?? '' };
}

export async function 관리계정번호(admin: APIRequestContext, 이름: string): Promise<string> {
  const 응답 = await admin.get(`/api/v1/admin/accounts?username=${encodeURIComponent(이름)}`);
  const 줄들 = (await 응답.json()) as { id?: string; username?: string }[];
  return 줄들.find((줄) => 줄.username === 이름)?.id ?? '';
}

export async function 가입계정지우기(admin: APIRequestContext, 이름: string): Promise<void> {
  const 번호 = await 관리계정번호(admin, 이름);
  if (번호 === '') return;
  await admin.post(`/api/v1/admin/accounts/${번호}/action`, { data: { type: 'suspend' } });
  await admin.delete(`/api/v1/admin/accounts/${번호}`);
}
