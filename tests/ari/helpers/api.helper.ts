import type { APIRequestContext, APIResponse } from '@playwright/test';

export type 제재종류 = 'SUSPEND' | 'CHAT_MUTE';

export interface 제재 {
  id: number;
  accountId: number;
  type: 제재종류;
  reason: string;
  endsAt: string | null;
  releasedAt: string | null;
}

export interface 점검설정 {
  id: number;
  enabled: boolean;
  message: string;
  startsAt: string | null;
  endsAt: string | null;
  allowedAccountIds: string;
}

export interface 지급본문 {
  characterIds: number[];
  subject: string;
  body: string;
  items: { itemName: string; quantity: number }[];
  currencyAmount: number;
  reason: string;
}

export interface 공지본문 {
  title: string;
  body: string;
  startsAt?: string | null;
  endsAt?: string | null;
  enabled?: boolean;
}

export function 시각(분: number): string {
  return new Date(Date.now() + 분 * 60_000).toISOString();
}

export function 글자(개수: number, 한글자 = '가'): string {
  return 한글자.repeat(개수);
}

export function 고유이름(머리: string): string {
  return `[QA] ${머리} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function 본문글(응답: APIResponse): Promise<string> {
  return (await 응답.body()).toString('utf8');
}

export async function 본문JSON<T>(응답: APIResponse): Promise<T> {
  return JSON.parse(await 본문글(응답)) as T;
}

export function 게임로그인(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return request.post('/api/login', { data: { UserName: 아이디, Password: 비밀번호 } });
}

export async function 게임토큰(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<{ status: number; accountId: number; token: string }> {
  const 응답 = await 게임로그인(request, 아이디, 비밀번호);
  if (!응답.ok()) return { status: 응답.status(), accountId: 0, token: '' };
  const 몸 = await 본문JSON<{ accountId: number; token: string }>(응답);
  return { status: 응답.status(), accountId: 몸.accountId, token: 몸.token };
}

export function 운영자로그인(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return request.post('/opsapi/login', { data: { userName: 아이디, password: 비밀번호 } });
}

export async function 운영자토큰(request: APIRequestContext, 아이디: string, 비밀번호: string): Promise<{ status: number; token: string; operatorId: number }> {
  const 응답 = await 운영자로그인(request, 아이디, 비밀번호);
  if (!응답.ok()) return { status: 응답.status(), token: '', operatorId: 0 };
  const 몸 = await 본문JSON<{ token: string; operator: { id: number } }>(응답);
  return { status: 응답.status(), token: 몸.token, operatorId: 몸.operator.id };
}

export function 인증헤더(토큰: string): Record<string, string> {
  return { Authorization: `Bearer ${토큰}` };
}

export function 토큰본문(토큰: string): Record<string, unknown> {
  const 가운데 = 토큰.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(가운데, 'base64url').toString('utf8')) as Record<string, unknown>;
}

export function 서명변경(토큰: string): string {
  const 마디 = 토큰.split('.');
  const 서명 = 마디[2] ?? '';
  const 끝 = 서명.endsWith('A') ? 'B' : 'A';
  마디[2] = `${서명.slice(0, -2)}${끝}${끝}`;
  return 마디.join('.');
}

export async function 계정번호찾기(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 응답 = await admin.get('/opsapi/users', { params: { q: 아이디, size: 100 } });
  if (!응답.ok()) return 0;
  const 몸 = await 본문JSON<{ items: { id: number; userName: string }[] }>(응답);
  return 몸.items.find((u) => u.userName === 아이디)?.id ?? 0;
}

export async function 계정상세(admin: APIRequestContext, 계정번호: number): Promise<{ id: number; userName: string; email: string; characters: { id: number; name: string }[]; sanctions: 제재[] } | null> {
  const 응답 = await admin.get(`/opsapi/users/${계정번호}`);
  if (!응답.ok()) return null;
  return 본문JSON(응답);
}

export async function 캐릭터번호찾기(admin: APIRequestContext, 계정번호: number): Promise<number> {
  return (await 계정상세(admin, 계정번호))?.characters[0]?.id ?? 0;
}

export function 제재걸기(admin: APIRequestContext, 계정번호: number, 본문: { type: string; reason: string; endsAt?: string | null }): Promise<APIResponse> {
  return admin.post(`/opsapi/users/${계정번호}/sanctions`, { data: 본문 });
}

export function 제재풀기(admin: APIRequestContext, 제재번호: number, 사유: string): Promise<APIResponse> {
  return admin.post(`/opsapi/sanctions/${제재번호}/release`, { data: { reason: 사유 } });
}

export async function 걸린제재모두풀기(admin: APIRequestContext, 계정번호: number, 종류?: 제재종류): Promise<void> {
  const 상세 = await 계정상세(admin, 계정번호);
  const 지금 = Date.now();
  for (const s of 상세?.sanctions ?? []) {
    const 살아있음 = s.releasedAt === null && (s.endsAt === null || Date.parse(s.endsAt) > 지금);
    if (살아있음 && (종류 === undefined || s.type === 종류)) await 제재풀기(admin, s.id, '[QA] 시험 정리');
  }
}

export async function 점검설정읽기(admin: APIRequestContext): Promise<점검설정> {
  return 본문JSON<점검설정>(await admin.get('/opsapi/maintenance'));
}

export function 점검설정바꾸기(
  admin: APIRequestContext,
  본문: { enabled: boolean; message: string; startsAt?: string | null; endsAt?: string | null; allowedAccountIds?: number[] | null },
): Promise<APIResponse> {
  return admin.put('/opsapi/maintenance', { data: 본문 });
}

export function 허용번호들(쉼표글: string): number[] {
  return 쉼표글
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function 점검되돌리기(admin: APIRequestContext, 원래: 점검설정): Promise<void> {
  await 점검설정바꾸기(admin, {
    enabled: 원래.enabled,
    message: 원래.message,
    startsAt: 원래.startsAt,
    endsAt: 원래.endsAt,
    allowedAccountIds: 허용번호들(원래.allowedAccountIds),
  });
}

export function 공지만들기(admin: APIRequestContext, 본문: 공지본문 | Record<string, unknown>): Promise<APIResponse> {
  return admin.post('/opsapi/notices', { data: 본문 });
}

export function 공지삭제(admin: APIRequestContext, 공지번호: number): Promise<APIResponse> {
  return admin.delete(`/opsapi/notices/${공지번호}`);
}

export async function 공지만들고번호(admin: APIRequestContext, 본문: 공지본문): Promise<number> {
  const 응답 = await 공지만들기(admin, 본문);
  return 응답.ok() ? (await 본문JSON<{ id: number }>(응답)).id : 0;
}

export async function 남은QA공지삭제(admin: APIRequestContext, 머리: string): Promise<void> {
  const 응답 = await admin.get('/opsapi/notices');
  if (!응답.ok()) return;
  const 공지들 = await 본문JSON<{ id: number; title: string }[]>(응답);
  for (const n of 공지들.filter((x) => x.title.startsWith(머리))) await 공지삭제(admin, n.id);
}

export function 기본지급(캐릭터번호: number, 머리: string, 덮어쓸것: Partial<지급본문> = {}): 지급본문 {
  const 이름 = 고유이름(머리);
  return {
    characterIds: [캐릭터번호],
    subject: 이름.slice(0, 50),
    body: '',
    items: [{ itemName: '체력 물약', quantity: 1 }],
    currencyAmount: 0,
    reason: 이름,
    ...덮어쓸것,
  };
}

export function 지급하기(admin: APIRequestContext, 본문: 지급본문 | Record<string, unknown>): Promise<APIResponse> {
  return admin.post('/opsapi/grants', { data: 본문 });
}

export async function 지급하고번호(admin: APIRequestContext, 본문: 지급본문): Promise<number> {
  const 응답 = await 지급하기(admin, 본문);
  return 응답.ok() ? (await 본문JSON<{ id: number }>(응답)).id : 0;
}

export function 지급회수(admin: APIRequestContext, 지급번호: number, 사유: string): Promise<APIResponse> {
  return admin.post(`/opsapi/grants/${지급번호}/recall`, { data: { reason: 사유 } });
}

export async function 지급정리(admin: APIRequestContext, 지급번호: number): Promise<void> {
  if (지급번호 > 0) await 지급회수(admin, 지급번호, '[QA] 시험 정리');
}

export async function 지급건찾기(
  admin: APIRequestContext,
  지급번호: number,
): Promise<{ id: number; mails: { playerCharacterId: number; mailMessageId: number; status: string }[] } | null> {
  for (let 페이지 = 1; 페이지 <= 5; 페이지 += 1) {
    const 응답 = await admin.get('/opsapi/grants', { params: { page: 페이지, size: 100 } });
    if (!응답.ok()) return null;
    const 몸 = await 본문JSON<{ items: { id: number; mails: { playerCharacterId: number; mailMessageId: number; status: string }[] }[] }>(응답);
    const 찾음 = 몸.items.find((g) => g.id === 지급번호);
    if (찾음 !== undefined) return 찾음;
    if (몸.items.length < 100) return null;
  }
  return null;
}
