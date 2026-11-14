import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 걸린제재모두풀기, 제재걸기 } from './api.helper.js';

export async function 채팅금지걸기(admin: APIRequestContext, 계정번호: number, 본문: { reason: string; endsAt?: string | null }): Promise<APIResponse> {
  let 응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', ...본문 });
  for (let 시도 = 0; 시도 < 3 && 응답.status() === 409; 시도 += 1) {
    await 걸린제재모두풀기(admin, 계정번호, 'CHAT_MUTE');
    await new Promise((r) => setTimeout(r, 500));
    응답 = await 제재걸기(admin, 계정번호, { type: 'CHAT_MUTE', ...본문 });
  }
  return 응답;
}

export async function 페이지개수읽기(admin: APIRequestContext, 경로: string, 크기: number): Promise<{ status: number; 개수: number; 전체: number }> {
  const 응답 = await admin.get(경로, { params: { size: 크기 } });
  if (!응답.ok()) return { status: 응답.status(), 개수: 0, 전체: 0 };
  const 몸 = (await 응답.json().catch(() => ({}))) as { items?: unknown[]; total?: number };
  return { status: 응답.status(), 개수: (몸.items ?? []).length, 전체: 몸.total ?? 0 };
}
