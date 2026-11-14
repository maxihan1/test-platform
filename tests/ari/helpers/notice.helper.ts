import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 공지만들기, 공지본문, 공지삭제, 본문JSON, 점검되돌리기, 점검설정바꾸기, 점검설정읽기 } from './api.helper.js';

export interface 서버상태 {
  maintenance: { active: boolean; message: string; startsAt: string | null; endsAt: string | null };
  notices: { id: number; title: string; body: string; startsAt: string; endsAt: string | null }[];
  serverTime: string;
}

export interface 공지몸 {
  id?: number;
  title?: string;
  body?: string;
  startsAt?: string;
  endsAt?: string | null;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  code?: string;
  message?: string;
}

export interface 점검몸 {
  id?: number;
  enabled?: boolean;
  message?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  allowedAccountIds?: string;
  code?: string;
}

export async function 서버상태읽기(request: APIRequestContext): Promise<{ 코드: number; 상태: 서버상태 | null }> {
  const 응답 = await request.get('/api/serverstatus');
  return { 코드: 응답.status(), 상태: 응답.ok() ? await 본문JSON<서버상태>(응답) : null };
}

export async function 점검켜고서버상태읽기(
  request: APIRequestContext,
  admin: APIRequestContext,
  본문: { enabled: boolean; message: string; startsAt?: string | null; endsAt?: string | null; allowedAccountIds?: number[] | null },
): Promise<{ 켜기코드: number; 상태: 서버상태 | null }> {
  const 원래 = await 점검설정읽기(admin);
  try {
    const 켜기 = await 점검설정바꾸기(admin, 본문);
    if (!켜기.ok()) return { 켜기코드: 켜기.status(), 상태: null };
    return { 켜기코드: 켜기.status(), 상태: (await 서버상태읽기(request)).상태 };
  } finally {
    await 점검되돌리기(admin, 원래);
  }
}

export async function 점검바꾸고되돌리기(
  admin: APIRequestContext,
  본문: { enabled: boolean; message: string; startsAt?: string | null; endsAt?: string | null; allowedAccountIds?: number[] | null },
): Promise<{ 응답: APIResponse; 몸: 점검몸 }> {
  const 원래 = await 점검설정읽기(admin);
  try {
    const 응답 = await 점검설정바꾸기(admin, 본문);
    return { 응답, 몸: (await 응답.json().catch(() => ({}))) as 점검몸 };
  } finally {
    await 점검되돌리기(admin, 원래);
  }
}

export async function 공지만들고기록(
  admin: APIRequestContext,
  본문: 공지본문 | Record<string, unknown>,
  기록: number[],
): Promise<{ 응답: APIResponse; 몸: 공지몸 }> {
  const 응답 = await 공지만들기(admin, 본문);
  const 몸 = (await 응답.json().catch(() => ({}))) as 공지몸;
  if (응답.ok() && typeof 몸.id === 'number') 기록.push(몸.id);
  return { 응답, 몸 };
}

export function 공지수정(admin: APIRequestContext, 공지번호: number, 본문: 공지본문 | Record<string, unknown>): Promise<APIResponse> {
  return admin.put(`/opsapi/notices/${공지번호}`, { data: 본문 });
}

export async function 공지목록읽기(admin: APIRequestContext): Promise<{ 코드: number; 목록: { id: number; title: string }[] }> {
  const 응답 = await admin.get('/opsapi/notices');
  return { 코드: 응답.status(), 목록: 응답.ok() ? await 본문JSON<{ id: number; title: string }[]>(응답) : [] };
}

export async function 공지여럿만들기(admin: APIRequestContext, 개수: number, 제목머리: string, 기록: number[]): Promise<number> {
  let 만든수 = 0;
  for (let 시작 = 0; 시작 < 개수; 시작 += 25) {
    const 묶음 = Array.from({ length: Math.min(25, 개수 - 시작) }, (_, i) =>
      공지만들고기록(admin, { title: `[QA] ${제목머리} ${시작 + i} ${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 60), body: '공지 건수 시험', enabled: false }, 기록),
    );
    const 결과들 = await Promise.all(묶음);
    만든수 += 결과들.filter((r) => r.응답.ok()).length;
  }
  return 만든수;
}

export async function 공지번호들삭제(admin: APIRequestContext, 번호들: number[]): Promise<void> {
  for (let 시작 = 0; 시작 < 번호들.length; 시작 += 25) {
    await Promise.all(번호들.slice(시작, 시작 + 25).map((n) => 공지삭제(admin, n)));
  }
}

export function 경계글(길이: number, 머리 = ''): string {
  return 길이 <= 머리.length ? 'Q'.repeat(길이) : `${머리}${'Q'.repeat(길이 - 머리.length)}`;
}

export function 시각같음(왼쪽: string | null | undefined, 오른쪽: string | null | undefined): boolean {
  return 왼쪽 !== null && 왼쪽 !== undefined && 오른쪽 !== null && 오른쪽 !== undefined && Date.parse(왼쪽) === Date.parse(오른쪽);
}
