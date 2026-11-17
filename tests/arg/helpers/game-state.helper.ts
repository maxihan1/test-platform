import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 공통HUD } from '../components/hud.component.js';
import { 채팅창 } from '../pages/chat.page.js';

const 운영 = 'https://bossroom-api.maxihan.com/opsapi';

async function 답(res: APIResponse, 무엇: string): Promise<unknown> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  const 글 = await res.text();
  return 글 === '' ? null : (JSON.parse(글) as unknown);
}

async function 시험답(res: APIResponse, 무엇: string): Promise<Record<string, unknown>> {
  const 몸 = (await 답(res, 무엇)) as Record<string, unknown> | null;
  if (몸?.ok === false) throw new Error(`${무엇} 실패: ${JSON.stringify(몸)}`);
  return 몸 ?? {};
}

export interface 접속자정보 {
  players: { user: string; name: string; level: number; bot: boolean }[];
  bots: string[];
}

export async function 접속자(admin: APIRequestContext): Promise<접속자정보> {
  return (await 시험답(await admin.get('/test/state'), '접속자 읽기')) as unknown as 접속자정보;
}

export async function 봇켜기(admin: APIRequestContext, 계정: { user: string; pass: string } | { bot: string }): Promise<string> {
  const 몸 = await 시험답(await admin.post('/test/bot/start', { data: 계정, timeout: 90_000 }), '봇 켜기');
  return String(몸.bot ?? ('user' in 계정 ? 계정.user : 계정.bot));
}

export async function 봇시키기(admin: APIRequestContext, 봇: string, 명령: string): Promise<void> {
  await 시험답(await admin.post('/test/bot/do', { data: { bot: 봇, cmd: 명령 } }), `봇 명령 ${명령}`);
}

export interface 봇줄 {
  type: string;
  data: Record<string, unknown>;
}

export async function 봇로그(admin: APIRequestContext, 봇: string, 비우기 = false): Promise<봇줄[]> {
  const 몸 = await 시험답(await admin.get(`/test/bot/log?bot=${encodeURIComponent(봇)}${비우기 ? '&clear=1' : ''}`), '봇 로그 읽기');
  return (몸.lines ?? []) as 봇줄[];
}

export async function 봇이본글기다리기(admin: APIRequestContext, 봇: string, 글: string, 시간 = 15_000): Promise<string | null> {
  const 끝 = Date.now() + 시간;
  do {
    for (const 줄 of await 봇로그(admin, 봇)) {
      const 내용 = JSON.stringify(줄.data);
      if (내용.includes(글)) return 내용;
    }
  } while (Date.now() < 끝);
  return null;
}

export async function 봇끄기(admin: APIRequestContext, 봇?: string): Promise<void> {
  await 시험답(await admin.post('/test/bot/stop', { data: 봇 === undefined ? { all: true } : { bot: 봇 } }), '봇 끄기');
}

export async function 실패걸기(admin: APIRequestContext, 경로: string, 횟수 = 1): Promise<void> {
  await 시험답(await admin.post('/test/fail', { data: { path: 경로, count: 횟수 } }), `요청 실패 걸기 ${경로}`);
}

export async function 접속끊기(admin: APIRequestContext, 아이디: string, 까닭?: string): Promise<void> {
  await 시험답(await admin.post('/test/kick', { data: { user: 아이디, ...(까닭 === undefined ? {} : { status: 까닭 }) } }), '접속 끊기');
}

export async function 계정되돌리기(
  admin: APIRequestContext,
  아이디: string,
  비밀번호: string,
  방식: 'new' | 'base' | 'raw',
  값: { level?: number; charName?: string } = {},
): Promise<void> {
  await 시험답(await admin.post('/test/reset', { data: { user: 아이디, pass: 비밀번호, mode: 방식, ...값 }, timeout: 60_000 }), `계정 되돌리기 ${방식}`);
}

export async function 기록없는우편(admin: APIRequestContext, 아이디: string, 비밀번호: string, 제목: string): Promise<void> {
  await 시험답(await admin.post('/test/mail', { data: { user: 아이디, pass: 비밀번호, cmd: 제목 } }), '기록 없는 첨부 우편');
}

export async function 계정번호(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 몸 = (await 답(await admin.get(`${운영}/users?q=${encodeURIComponent(아이디)}`), '계정 찾기')) as { items: { id: number; userName: string }[] };
  const 계정 = 몸.items.find((u) => u.userName === 아이디);
  if (계정 === undefined) throw new Error(`계정 ${아이디} 를 운영 API 에서 못 찾았다`);
  return 계정.id;
}

export interface 캐릭터값 {
  id: number;
  name: string;
  level: number;
  골드: number;
  items: Record<string, number>;
  savedOn: string;
}

export async function 캐릭터(admin: APIRequestContext, 이름: string): Promise<캐릭터값> {
  const 몸 = (await 답(await admin.get(`${운영}/characters?q=${encodeURIComponent(이름)}`), '캐릭터 읽기')) as {
    id: number;
    name: string;
    level: number;
    savedOn: string;
    currencies: { CurrencyName: string; Amount: number }[];
    items: Record<string, number>;
  }[];
  const 찾은것 = 몸.find((c) => c.name === 이름);
  if (찾은것 === undefined) throw new Error(`캐릭터 ${이름} 를 운영 API 에서 못 찾았다`);
  return {
    id: 찾은것.id,
    name: 찾은것.name,
    level: 찾은것.level,
    골드: 찾은것.currencies.find((c) => c.CurrencyName === 'Gold')?.Amount ?? 0,
    items: 찾은것.items,
    savedOn: 찾은것.savedOn,
  };
}

export async function 캐릭터있나(admin: APIRequestContext, 이름: string): Promise<boolean> {
  const 몸 = (await 답(await admin.get(`${운영}/characters?q=${encodeURIComponent(이름)}`), '캐릭터 읽기')) as { name: string }[];
  return 몸.some((c) => c.name === 이름);
}

export async function 우편보내기(
  admin: APIRequestContext,
  캐릭터이름: string,
  우편: { 제목: string; 본문?: string; 아이템?: { 이름: string; 개수: number }[]; 골드?: number },
): Promise<number> {
  const { id } = await 캐릭터(admin, 캐릭터이름);
  const 첨부없음 = (우편.아이템 ?? []).length === 0 && (우편.골드 ?? 0) === 0;
  const 몸 = (await 답(
    await admin.post(`${운영}/grants`, {
      data: {
        characterIds: [id],
        subject: 우편.제목,
        body: 우편.본문 ?? '자동 시험',
        items: 첨부없음 ? [{ itemName: '체력 물약', quantity: 1 }] : (우편.아이템 ?? []).map((a) => ({ itemName: a.이름, quantity: a.개수 })),
        currencyAmount: 우편.골드 ?? 0,
        reason: 'QA 자동 시험',
      },
    }),
    '우편 지급',
  )) as { id: number };
  if (첨부없음) await 지급회수(admin, 몸.id);
  return 몸.id;
}

export interface 지급줄 {
  id: number;
  subject: string;
  mails: { characterName: string; mailMessageId: number; status: string }[];
}

export async function 지급목록(admin: APIRequestContext, 개수 = 10): Promise<지급줄[]> {
  return ((await 답(await admin.get(`${운영}/grants?size=${String(개수)}`), '지급 이력 읽기')) as { items: 지급줄[] }).items;
}

export async function 지급회수(admin: APIRequestContext, 지급번호: number): Promise<void> {
  await 답(await admin.post(`${운영}/grants/${String(지급번호)}/recall`, { data: { reason: 'QA 자동 시험 회수' } }), '지급 회수');
}

export async function 제재걸기(admin: APIRequestContext, 아이디: string, 종류: 'SUSPEND' | 'CHAT_MUTE', 사유: string, 끝?: string): Promise<number> {
  const 번호 = await 계정번호(admin, 아이디);
  const 몸 = (await 답(
    await admin.post(`${운영}/users/${String(번호)}/sanctions`, { data: { type: 종류, reason: 사유, ...(끝 === undefined ? {} : { endsAt: 끝 }) } }),
    '제재 걸기',
  )) as { id: number };
  return 몸.id;
}

export async function 제재풀기(admin: APIRequestContext, 제재번호: number): Promise<void> {
  await 답(await admin.post(`${운영}/sanctions/${String(제재번호)}/release`, { data: { reason: 'QA 자동 시험 끝' } }), '제재 풀기');
}

export async function 점검켜기(admin: APIRequestContext, 안내: string, 덧: { 끝?: string; 허용아이디?: string[] } = {}): Promise<void> {
  const 허용: number[] = [];
  for (const 아이디 of 덧.허용아이디 ?? []) 허용.push(await 계정번호(admin, 아이디));
  await 답(
    await admin.put(`${운영}/maintenance`, {
      data: { enabled: true, message: 안내, startsAt: null, endsAt: 덧.끝 ?? null, allowedAccountIds: 허용 },
    }),
    '점검 켜기',
  );
}

export async function 점검끄기(admin: APIRequestContext): Promise<void> {
  await 답(await admin.put(`${운영}/maintenance`, { data: { enabled: false, message: '', startsAt: null, endsAt: null, allowedAccountIds: [] } }), '점검 끄기');
}

export async function 공지만들기(admin: APIRequestContext, 제목: string, 내용: string): Promise<number> {
  const 몸 = (await 답(await admin.post(`${운영}/notices`, { data: { title: 제목, body: 내용, enabled: true } }), '공지 만들기')) as { id: number };
  return 몸.id;
}

export async function 공지지우기(admin: APIRequestContext, 번호: number): Promise<void> {
  await 답(await admin.delete(`${운영}/notices/${String(번호)}`), '공지 지우기');
}

export async function QA공지치우기(admin: APIRequestContext): Promise<void> {
  const 목록 = (await 답(await admin.get(`${운영}/notices`), '공지 읽기')) as { id: number; title: string }[];
  for (const 공지 of 목록.filter((n) => n.title.startsWith('[QA]'))) await 공지지우기(admin, 공지.id);
}

export function 끝날시각(분: number): string {
  return new Date(Date.now() + 분 * 60_000).toISOString();
}

export async function GM(game: GameDriver, 명령: string): Promise<void> {
  const 창 = await 채팅창.열기(game);
  await 창.보내기(명령);
  await 창.닫기누르기();
}

export async function GM결과기다리기(game: GameDriver, 명령: string, 결과글: string, 시간 = 15_000): Promise<boolean> {
  await GM(game, 명령);
  return game.waitFor(`//*[contains(@text,${결과글})]`, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
}

export type 상태값 = Record<string, string>;

function 줄풀기(줄: string): 상태값 {
  const 값: 상태값 = {};
  for (const 조각 of 줄.replace(/<[^>]+>/g, '').replace(/^.*\[GM\] (stat|data \w+)\s*/, '').split(/\s+(?=[^\s=]+=)/)) {
    const 자리 = 조각.indexOf('=');
    if (자리 > 0) 값[조각.slice(0, 자리).trim()] = 조각.slice(자리 + 1).trim();
  }
  return 값;
}

export async function GM줄읽기(game: GameDriver, 명령: string, 머리: string, 줄수: number): Promise<string[]> {
  const 창 = await 채팅창.열기(game);
  const 앞 = (await 창.줄들()).join('\n');
  await 창.보내기(명령);
  const 끝 = Date.now() + 15_000;
  let 뒤: string[] = [];
  do {
    const 줄들 = await 창.줄들();
    뒤 = 줄들.slice(-줄수);
    if (줄들.join('\n') !== 앞 && 뒤.length === 줄수 && 뒤.every((줄) => 줄.includes(머리))) break;
    뒤 = [];
  } while (Date.now() < 끝);
  await 창.닫기누르기();
  if (뒤.length === 0) throw new Error(`${명령} 결과 줄이 15초 안에 오지 않았다`);
  return 뒤.map((줄) => 줄.replace(/<[^>]+>/g, ''));
}

export async function 상태읽기(game: GameDriver, 던전 = false): Promise<상태값> {
  const 줄들 = await GM줄읽기(game, '/gm stat', '[GM] stat', 던전 ? 3 : 2);
  return Object.assign({}, ...줄들.map(줄풀기)) as 상태값;
}

export async function 데이터읽기(game: GameDriver, 종류: 'monster' | 'skill' | 'bag'): Promise<string[]> {
  const 창 = await 채팅창.열기(game);
  const 머리 = `[GM] data ${종류}`;
  const 앞수 = (await 창.줄들()).length;
  await 창.보내기(`/gm data ${종류}`);
  const 끝 = Date.now() + 20_000;
  let 줄들: string[] = [];
  let 지난수 = -1;
  do {
    const 새줄 = (await 창.줄들()).slice(앞수).filter((줄) => 줄.includes(머리));
    const 다옴 = 종류 === 'bag' ? /끝/.test(새줄.at(-1) ?? '') : 새줄.length > 0 && 새줄.length === 지난수;
    if (다옴) {
      줄들 = 새줄;
      break;
    }
    지난수 = 새줄.length;
  } while (Date.now() < 끝);
  await 창.닫기누르기();
  if (줄들.length === 0) throw new Error(`/gm data ${종류} 결과 줄이 20초 안에 오지 않았다`);
  return 줄들.map((줄) => 줄.replace(/<[^>]+>/g, ''));
}

export async function 상단바골드(game: GameDriver): Promise<number> {
  return Number((await new 공통HUD(game).골드글()).replace(/[^0-9]/g, ''));
}

export async function 저장될때까지(admin: APIRequestContext, 이름: string, 맞나: (값: 캐릭터값) => boolean, 시간 = 25_000): Promise<캐릭터값> {
  const 끝 = Date.now() + 시간;
  let 값 = await 캐릭터(admin, 이름);
  while (!맞나(값) && Date.now() < 끝) 값 = await 캐릭터(admin, 이름);
  return 값;
}
