import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface 게임응답 {
  status: number;
  body: Record<string, unknown>;
}

export interface 게임우편 {
  id: number;
  playerCharacterId: number;
  saveData: string;
}

const 주소 = (서버: string, 경로: string): string => `${서버.replace(/\/$/, '')}${경로}`;

const 머리 = (토큰: string): Record<string, string> => ({ authorization: `Bearer ${토큰}` });

async function 받기(요청: Promise<APIResponse>): Promise<게임응답> {
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

export function 채운값(값: string | undefined, 무엇: string): string {
  if (!값) throw new Error(`${무엇} 값이 없다 — 대상 서버 계정(PLATFORM_ACCOUNTS)이 채워지지 않았다`);
  return 값;
}

export const 게임로그인 = (request: APIRequestContext, 서버: string, 아이디: string, 비밀번호: string): Promise<게임응답> =>
  받기(request.post(주소(서버, '/api/login'), { data: { userName: 아이디, password: 비밀번호 } }));

export async function 게임토큰받기(request: APIRequestContext, 서버: string, 아이디: string, 비밀번호: string): Promise<string> {
  const r = await 게임로그인(request, 서버, 아이디, 비밀번호);
  if (r.status !== 200 || typeof r.body.token !== 'string') throw new Error(`게임 로그인이 ${String(r.status)} 로 실패했다`);
  return r.body.token;
}

export async function 게임서버토큰받기(request: APIRequestContext, 서버: string, 공유비밀: string): Promise<string> {
  const r = await 받기(request.post(주소(서버, '/api/serverlogin'), { data: { sharedSecret: 공유비밀 } }));
  if (r.status !== 200 || typeof r.body.token !== 'string') throw new Error(`게임 서버 토큰 받기가 ${String(r.status)} 로 실패했다`);
  return r.body.token;
}

export const 계정제한읽기 = (request: APIRequestContext, 서버: string, 토큰: string, 계정: number): Promise<게임응답> =>
  받기(request.post(주소(서버, '/api/getaccountrestrictions'), { headers: 머리(토큰), data: { accountId: 계정 } }));

export const 운영자API부르기 = (request: APIRequestContext, 서버: string, 토큰: string): Promise<게임응답> =>
  받기(request.get(주소(서버, '/opsapi/me'), { headers: 머리(토큰) }));

export async function 우편읽기(request: APIRequestContext, 서버: string, 토큰: string, 캐릭터: number, 우편번호: number): Promise<게임우편 | null> {
  const r = await 받기(request.post(주소(서버, '/api/getmailmessages'), { headers: 머리(토큰), data: { playerCharacterId: 캐릭터 } }));
  if (r.status !== 200) throw new Error(`우편 읽기가 ${String(r.status)} 로 실패했다`);
  const 목록 = (r.body.mailMessages ?? []) as 게임우편[];
  return 목록.find((m) => m.id === 우편번호) ?? null;
}

const 첨부자리 = /"AttachmentSlots":\[(.*?)\](?=,"CurrencyAmount")/;

export function 첨부칸들(saveData: string): string[] {
  const 찾음 = 첨부자리.exec(saveData);
  if (찾음 === null) throw new Error('우편 saveData 에서 AttachmentSlots 를 찾지 못했다');
  const 안 = 찾음[1] ?? '';
  return 안 === '' ? [] : 안.split(/(?<=\]\}),(?=\{)/);
}

export async function 첨부가져가기(request: APIRequestContext, 서버: string, 토큰: string, 캐릭터: number, 우편번호: number, 가져갈칸수: number): Promise<void> {
  const 우편 = await 우편읽기(request, 서버, 토큰, 캐릭터, 우편번호);
  if (우편 === null) throw new Error(`우편 #${String(우편번호)} 를 게임 서버에서 찾지 못했다`);
  const 남길칸 = 첨부칸들(우편.saveData).slice(가져갈칸수);
  const 새글 = 우편.saveData.replace(첨부자리, `"AttachmentSlots":[${남길칸.join(',')}]`);
  const r = await 받기(request.post(주소(서버, '/api/savemailmessage'), { headers: 머리(토큰), data: { id: 우편.id, playerCharacterId: 캐릭터, saveData: 새글 } }));
  if (r.status >= 300) throw new Error(`우편 저장이 ${String(r.status)} 로 실패했다`);
}
