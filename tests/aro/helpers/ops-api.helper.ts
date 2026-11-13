import type { APIRequestContext, Page } from '@playwright/test';

export interface 응답 {
  status: number;
  body: Record<string, unknown>;
}

export type 제재종류 = 'SUSPEND' | 'CHAT_MUTE';

export interface 제재 {
  id: number;
  accountId: number;
  type: string;
  reason: string;
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
  releasedAt: string | null;
  releasedBy: string | null;
  releaseReason: string | null;
}

export interface 계정상세 {
  id: number;
  userName: string;
  email: string;
  suspended: boolean;
  chatMuted: boolean;
  characters: { id: number; accountId: number; name: string; level: number | null; items: Record<string, number> | null }[];
  sanctions: 제재[];
}

export interface 지급내용 {
  characterIds: number[];
  subject: string;
  body: string;
  items: { itemName: string; quantity: number }[];
  currencyAmount: number;
  reason: string;
}

export interface 지급건 {
  id: number;
  subject: string;
  items: { itemName: string; quantity: number }[];
  currencyAmount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  recalledAt: string | null;
  recalledBy: string | null;
  mails: { playerCharacterId: number; characterName: string; mailMessageId: number; status: string }[];
}

export interface 공지내용 {
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  enabled: boolean;
}

export interface 공지 extends 공지내용 {
  id: number;
  createdBy: string;
  updatedAt: string;
}

export interface 점검 {
  enabled: boolean;
  message: string;
  startsAt: string | null;
  endsAt: string | null;
  allowedAccountIds: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

async function 받기(요청: Promise<import('@playwright/test').APIResponse>): Promise<응답> {
  const r = await 요청;
  const 글 = await r.text();
  let body: Record<string, unknown> = {};
  try {
    body = 글 === '' ? {} : (JSON.parse(글) as Record<string, unknown>);
  } catch {
    body = { 원문: 글 };
  }
  return { status: r.status(), body };
}

const 요청자 = (page: Page): APIRequestContext => page.request;

export const opsGet = (page: Page, 경로: string): Promise<응답> => 받기(요청자(page).get(`/api/ops${경로}`));
export const opsPost = (page: Page, 경로: string, data: unknown): Promise<응답> => 받기(요청자(page).post(`/api/ops${경로}`, { data }));
export const opsPut = (page: Page, 경로: string, data: unknown): Promise<응답> => 받기(요청자(page).put(`/api/ops${경로}`, { data }));
export const opsDelete = (page: Page, 경로: string): Promise<응답> => 받기(요청자(page).delete(`/api/ops${경로}`));

function 성공(r: 응답, 무엇: string): Record<string, unknown> {
  if (r.status >= 300) throw new Error(`${무엇} 이(가) ${String(r.status)} 로 실패했다: ${JSON.stringify(r.body)}`);
  return r.body;
}

export function 글자(길이: number, 낱자 = '가'): string {
  return 낱자.repeat(길이);
}

export async function 계정번호(page: Page, 아이디: string): Promise<number> {
  const 몸 = 성공(await opsGet(page, `/users?q=${encodeURIComponent(아이디)}&page=1&size=100`), '계정 찾기') as { items: { id: number; userName: string }[] };
  const 줄 = 몸.items.find((u) => u.userName === 아이디);
  if (!줄) throw new Error(`계정 「${아이디}」를 찾지 못했다`);
  return 줄.id;
}

export async function 계정목록(page: Page): Promise<{ items: { id: number; userName: string; email: string; characterCount: number; suspended: boolean; chatMuted: boolean }[]; total: number }> {
  return 성공(await opsGet(page, '/users?q=&page=1&size=100'), '계정 목록') as never;
}

export async function 계정상세읽기(page: Page, 계정: number): Promise<계정상세> {
  return 성공(await opsGet(page, `/users/${String(계정)}`), '계정 상세') as unknown as 계정상세;
}

export async function 캐릭터번호(page: Page, 이름: string): Promise<number> {
  const r = await opsGet(page, `/characters?q=${encodeURIComponent(이름)}`);
  const 목록 = 성공(r, '캐릭터 찾기') as unknown as { id: number; name: string }[];
  const 줄 = 목록.find((c) => c.name === 이름);
  if (!줄) throw new Error(`캐릭터 「${이름}」를 찾지 못했다`);
  return 줄.id;
}

export const 제재걸기 = (page: Page, 계정: number, 내용: { type: string; reason: string; endsAt: string | null }): Promise<응답> =>
  opsPost(page, `/users/${String(계정)}/sanctions`, 내용);

export const 제재해제 = (page: Page, 제재번호: number, 사유: string): Promise<응답> => opsPost(page, `/sanctions/${String(제재번호)}/release`, { reason: 사유 });

const 적용중 = (s: 제재): boolean => !s.releasedAt && (!s.endsAt || new Date(s.endsAt).getTime() > Date.now());

export async function 적용중제재풀기(page: Page, 계정: number, 종류?: 제재종류): Promise<void> {
  const 상세 = await 계정상세읽기(page, 계정);
  for (const s of 상세.sanctions.filter((x) => 적용중(x) && (종류 === undefined || x.type === 종류))) {
    const r = await 제재해제(page, s.id, '[QA] 시험 정리');
    if (r.status >= 300 && r.status !== 409) throw new Error(`제재 ${String(s.id)} 해제가 ${String(r.status)} 로 실패했다`);
  }
}

export async function 새제재걸기(page: Page, 계정: number, 종류: 제재종류, 사유: string, endsAt: string | null = null): Promise<number> {
  await 적용중제재풀기(page, 계정, 종류);
  성공(await 제재걸기(page, 계정, { type: 종류, reason: 사유, endsAt }), '제재 걸기');
  const 상세 = await 계정상세읽기(page, 계정);
  const s = 상세.sanctions.find((x) => x.type === 종류 && x.reason === 사유 && 적용중(x));
  if (!s) throw new Error('건 제재를 이력에서 찾지 못했다');
  return s.id;
}

export const 지급보내기 = (page: Page, 내용: 지급내용): Promise<응답> => opsPost(page, '/grants', 내용);

export async function 새지급(page: Page, 내용: 지급내용): Promise<number> {
  const 몸 = 성공(await 지급보내기(page, 내용), '지급 보내기') as { id: number };
  return 몸.id;
}

export const 지급회수 = (page: Page, 지급번호: number, 사유: string): Promise<응답> => opsPost(page, `/grants/${String(지급번호)}/recall`, { reason: 사유 });

export async function 지급치우기(page: Page, 지급번호: number): Promise<void> {
  const r = await 지급회수(page, 지급번호, '[QA] 시험 정리');
  if (r.status >= 300 && r.status !== 409) throw new Error(`지급 ${String(지급번호)} 회수가 ${String(r.status)} 로 실패했다`);
}

export async function 지급목록(page: Page, 쪽 = 1, 크기 = 20): Promise<{ items: 지급건[]; total: number }> {
  return 성공(await opsGet(page, `/grants?page=${String(쪽)}&size=${String(크기)}`), '지급 목록') as never;
}

export async function 지급읽기(page: Page, 지급번호: number): Promise<지급건> {
  for (let 쪽 = 1; 쪽 <= 20; 쪽 += 1) {
    const 목록 = await 지급목록(page, 쪽, 100);
    const g = 목록.items.find((x) => x.id === 지급번호);
    if (g) return g;
    if (쪽 * 100 >= 목록.total) break;
  }
  throw new Error(`지급 #${String(지급번호)} 를 찾지 못했다`);
}

export const 공지목록 = async (page: Page): Promise<공지[]> => 성공(await opsGet(page, '/notices'), '공지 목록') as unknown as 공지[];
export const 공지저장 = (page: Page, 내용: 공지내용): Promise<응답> => opsPost(page, '/notices', 내용);
export const 공지고치기 = (page: Page, 번호: number, 내용: 공지내용): Promise<응답> => opsPut(page, `/notices/${String(번호)}`, 내용);
export const 공지지우기 = (page: Page, 번호: number): Promise<응답> => opsDelete(page, `/notices/${String(번호)}`);

export async function 새공지(page: Page, 내용: 공지내용): Promise<number> {
  const 몸 = 성공(await 공지저장(page, 내용), '공지 저장') as { id: number };
  return 몸.id;
}

export async function 공지치우기(page: Page, 머리글: string): Promise<void> {
  for (const n of await 공지목록(page)) if (n.title.startsWith(머리글)) await 공지지우기(page, n.id);
}

export const 점검읽기 = async (page: Page): Promise<점검> => 성공(await opsGet(page, '/maintenance'), '점검 읽기') as unknown as 점검;
export const 허용계정배열 = (글: string): number[] => 글.split(',').map((x) => x.trim()).filter((x) => x !== '').map(Number);

export const 점검저장 = (page: Page, 내용: 점검): Promise<응답> =>
  opsPut(page, '/maintenance', { enabled: 내용.enabled, message: 내용.message, startsAt: 내용.startsAt, endsAt: 내용.endsAt, allowedAccountIds: 허용계정배열(내용.allowedAccountIds) });

export async function 점검되돌리기(page: Page, 앞: 점검): Promise<void> {
  const r = await 점검저장(page, 앞);
  if (r.status >= 300) {
    const 끄기 = await 점검저장(page, { enabled: false, message: '', startsAt: null, endsAt: null, allowedAccountIds: '' });
    if (끄기.status >= 300) throw new Error(`점검을 되돌리지 못했다: ${String(끄기.status)}`);
  }
}

export async function 기록찾기(page: Page, 갈래: 'audit' | 'items', 검색어: string): Promise<{ items: Record<string, unknown>[]; total: number }> {
  return 성공(await opsGet(page, `/logs/${갈래}?${갈래 === 'audit' ? 'area=' : 'kind='}&q=${encodeURIComponent(검색어)}&page=1&size=50`), '기록 찾기') as never;
}

export async function 서버상태(request: APIRequestContext, API서버: string): Promise<{ maintenance: Record<string, unknown>; notices: Record<string, unknown>[]; serverTime: string }> {
  const r = await request.get(`${API서버.replace(/\/$/, '')}/api/serverstatus`);
  if (!r.ok()) throw new Error(`/api/serverstatus 가 ${String(r.status())} 로 실패했다`);
  return (await r.json()) as never;
}
