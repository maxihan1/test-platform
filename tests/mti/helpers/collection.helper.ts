import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 계정번호 } from './account.helper.js';
import { 머리 } from './auth.helper.js';

export const 넣을계정후보 = [
  ...Array.from({ length: 20 }, (_, 순번) => `qa_feat_${String(순번 + 1).padStart(2, '0')}`),
  'hana_photo',
  'minjun_dev',
  'seoyeon_books',
  'jiho_cafe',
  'news_bot',
  'noisy_cho',
  'promo_lee',
];

export interface 채운컬렉션 {
  넣은수: number;
  남은후보: string[];
}

export async function 컬렉션항목넣기(request: APIRequestContext, 토큰: string, 컬렉션: string, 이름: string): Promise<APIResponse> {
  const 계정 = await 계정번호(request, 이름);
  return request.post(`/api/v1/collections/${컬렉션}/items`, { headers: 머리(토큰), data: { account_id: 계정 } });
}

export async function 컬렉션계정채우기(request: APIRequestContext, 토큰: string, 컬렉션: string, 개수: number): Promise<채운컬렉션> {
  let 넣은수 = 0;
  let 순번 = 0;
  while (넣은수 < 개수 && 순번 < 넣을계정후보.length) {
    const 응답 = await 컬렉션항목넣기(request, 토큰, 컬렉션, 넣을계정후보[순번] ?? '');
    if (응답.status() === 200) 넣은수 += 1;
    순번 += 1;
  }
  return { 넣은수, 남은후보: 넣을계정후보.slice(순번) };
}

export async function 공개컬렉션번호(request: APIRequestContext, 주인: string, 이름: string): Promise<string> {
  const 계정 = await 계정번호(request, 주인);
  const 응답 = await request.get(`/api/v1/accounts/${계정}/collections`);
  if (응답.status() !== 200) return '';
  const 몸 = (await 응답.json()) as { collections?: { id?: string; name?: string }[] };
  return 몸.collections?.find((묶음) => 묶음.name === 이름)?.id ?? '';
}
