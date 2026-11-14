import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 걸린제재모두풀기, 제재걸기, 지급건찾기 } from './api.helper.js';
import { 우편한통읽기 } from './mail.helper.js';

export async function 정지걸기(admin: APIRequestContext, 계정번호: number, 본문: { reason: string; endsAt?: string | null }): Promise<APIResponse> {
  let 응답 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', ...본문 });
  for (let 시도 = 0; 시도 < 3 && 응답.status() === 409; 시도 += 1) {
    await 걸린제재모두풀기(admin, 계정번호, 'SUSPEND');
    await new Promise((r) => setTimeout(r, 500));
    응답 = await 제재걸기(admin, 계정번호, { type: 'SUSPEND', ...본문 });
  }
  return 응답;
}

export async function 지급우편번호(admin: APIRequestContext, 지급번호: number): Promise<number> {
  return (await 지급건찾기(admin, 지급번호))?.mails[0]?.mailMessageId ?? 0;
}

export async function 우편저장글읽기(request: APIRequestContext, 토큰: string, 우편번호: number): Promise<string> {
  return (await 우편한통읽기(request, 토큰, 우편번호)).저장글;
}

export async function 지급우편상태기다리기(admin: APIRequestContext, 지급번호: number, 기대상태들: string[], 한도밀리초 = 10_000): Promise<string> {
  const 끝 = Date.now() + 한도밀리초;
  for (;;) {
    const 상태 = (await 지급건찾기(admin, 지급번호))?.mails[0]?.status ?? '';
    if (기대상태들.includes(상태) || Date.now() >= 끝) return 상태;
    await new Promise((r) => setTimeout(r, 500));
  }
}
