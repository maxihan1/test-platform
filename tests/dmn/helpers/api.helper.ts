import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface 기기 {
  id: string;
  userId: string;
  platform: string;
  pushToken: string;
  createdAt: string;
}

export interface 푸시 {
  id: string;
  userId: string;
  title: string;
  body: string;
  status: string;
  failReason: string | null;
  deviceCount: number;
  scheduledAt: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface 푸시쪽 {
  items: 푸시[];
  total: number;
  page: number;
  size: number;
}

interface 오류본문 {
  code?: string;
  error?: string;
}

export const 없는번호 = (앞: string): string => `${앞}_dmn_none_${Date.now().toString(36)}`;

export const 새회원아이디 = (): string => `dmn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const 새푸시토큰 = (앞 = 'tok-'): string => `${앞}${새회원아이디()}`;

export const 길이맞춘글자 = (앞: string, 길이: number): string => (앞 + 'x'.repeat(길이)).slice(0, 길이);

export const 틀린기본인증 = (): string => `Basic ${Buffer.from(`dmn-unknown-client:dmn-not-registered`).toString('base64')}`;

export const 분뒤 = (분: number): string => new Date(Date.now() + 분 * 60_000).toISOString();

export const 서울시각 = (분: number): string => `${new Date(Date.now() + 분 * 60_000 + 9 * 3_600_000).toISOString().slice(0, 19)}+09:00`;

export const 시간대없는시각 = (분: number): string => new Date(Date.now() + 분 * 60_000).toISOString().slice(0, 19);

export async function 기기등록(api: APIRequestContext, userId: string, pushToken: string, platform = 'android'): Promise<APIResponse> {
  return api.post('/v1/devices', { data: { userId, platform, pushToken } });
}

export async function 기기지우기(api: APIRequestContext, id: string): Promise<APIResponse> {
  return api.delete(`/v1/devices/${id}`);
}

export async function 기기모두지우기(api: APIRequestContext, ids: readonly string[]): Promise<void> {
  for (const id of ids) await 기기지우기(api, id);
}

export async function 푸시보내기(api: APIRequestContext, 본문: Record<string, unknown>, 머리: Record<string, string> = {}): Promise<APIResponse> {
  return api.post('/v1/pushes', { data: 본문, headers: 머리 });
}

export async function 푸시조회(api: APIRequestContext, id: string): Promise<APIResponse> {
  return api.get(`/v1/pushes/${id}`);
}

export async function 푸시이력(api: APIRequestContext, 조건: Record<string, string | number>): Promise<APIResponse> {
  return api.get('/v1/pushes', { params: 조건 });
}

export async function 응답글(res: APIResponse): Promise<string> {
  const 종류 = res.headers()['content-type'] ?? '';
  if (!종류.includes('json')) return String(res.status());
  const 본문 = (await res.json()) as 오류본문;
  const 코드 = 본문.code ?? 본문.error ?? '';
  return 코드 === '' ? String(res.status()) : `${String(res.status())} ${코드}`;
}

export async function 기기값(res: APIResponse): Promise<기기> {
  return (await res.json()) as 기기;
}

export async function 푸시값(res: APIResponse): Promise<푸시> {
  return (await res.json()) as 푸시;
}

export async function 쪽값(res: APIResponse): Promise<푸시쪽> {
  return (await res.json()) as 푸시쪽;
}

const 쉬기 = (ms: number): Promise<void> =>
  new Promise((끝) => {
    setTimeout(끝, ms);
  });

export async function 발송끝기다리기(api: APIRequestContext, id: string, 한도ms = 10_000): Promise<푸시 | null> {
  const 끝 = Date.now() + 한도ms;
  let 마지막: 푸시 | null = null;
  while (Date.now() < 끝) {
    const res = await 푸시조회(api, id);
    if (res.status() === 200) {
      마지막 = await 푸시값(res);
      if (마지막.status !== 'QUEUED') return 마지막;
    }
    await 쉬기(500);
  }
  return 마지막;
}

export async function 여러번보내기(api: APIRequestContext, userId: string, 횟수: number): Promise<number[]> {
  const 코드들: number[] = [];
  for (let i = 1; i <= 횟수; i += 1) {
    const res = await 푸시보내기(api, { userId, title: `보내기 제한 ${String(i)}`, body: '보내기 제한 확인' });
    코드들.push(res.status());
  }
  return 코드들;
}
