import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

export interface 계정 {
  아이디: string;
  비밀번호: string;
}

export interface 봇줄 {
  type: string;
  data: Record<string, unknown>;
}

export interface 캐릭터값 {
  id: number;
  level: number;
  골드: number;
  아이템: Record<string, number>;
}

const 운영 = 'https://bossroom-api.maxihan.com/opsapi';
const 채팅창 = '/Showcase HUD/Window 채팅';
const 채팅줄 = `${채팅창}/Panel 채팅/Scroll/Content/Row`;
const 창이름 = ['가방', '상점', '일일 퀘스트', '우편함', '친구 · 파티', '길드', '채팅'];

export function 계정꺼내기(아이디: string | undefined, 비밀번호: string | undefined, 역할 = '일반 회원'): 계정 {
  if (!아이디 || !비밀번호) throw new Error(`${역할} 계정 값이 비어 있습니다 — 대상 서버 줄의 ${역할} 계정을 확인합니다`);
  return { 아이디, 비밀번호 };
}

async function 보내기(admin: APIRequestContext, 방법: 'GET' | 'POST' | 'PUT' | 'DELETE', 주소: string, 본문?: unknown): Promise<unknown> {
  const 응답 = await admin.fetch(주소, { method: 방법, ...(본문 === undefined ? {} : { data: 본문 }) });
  const 글 = await 응답.text();
  if (!응답.ok()) throw new Error(`${방법} ${주소} 실패: ${String(응답.status())} ${글.slice(0, 300)}`);
  if (글 === '') return null;
  const 값 = JSON.parse(글) as unknown;
  if (값 !== null && typeof 값 === 'object' && (값 as { ok?: unknown }).ok === false) {
    throw new Error(`${방법} ${주소} 거절: ${글.slice(0, 300)}`);
  }
  return 값;
}

export interface 로그사람 {
  user: string;
  level: number;
  job: string;
  weapon: string;
  armor: string;
  accessory: string;
}

export interface 로그적 {
  npc: string;
}

export interface 로그줄 {
  seq: number;
  kind: 'hit' | 'heal' | 'kill' | 'item' | 'levelup';
  players: number;
  from?: 로그사람 | 로그적;
  to?: 로그사람 | 로그적;
  by?: 로그사람 | 로그적;
  skill?: string;
  value?: number;
  hpBefore?: number;
  npc?: string;
  gold?: number;
  exp?: number;
  party?: number;
  item?: string;
  count?: number;
}

export async function 로그읽기(admin: APIRequestContext, since: number | null): Promise<{ last: number; lines: 로그줄[] }> {
  const 값 = (await 보내기(admin, 'GET', `/test/log?since=${String(since ?? 999999)}`)) as { last: number; lines?: 로그줄[] };
  const 줄들 = since === null ? [] : (값.lines ?? []);
  const 첫번호 = 줄들[0]?.seq;
  if (since !== null && 첫번호 !== undefined && 첫번호 !== since + 1) throw new Error(`게임 로그 줄이 빠졌습니다 (since ${String(since)} · 첫 줄 ${String(첫번호)})`);
  return { last: 값.last, lines: 줄들 };
}

export async function 접속자(admin: APIRequestContext): Promise<{ players: { user: string; name: string; level: number; bot: boolean }[]; bots: string[] }> {
  return (await 보내기(admin, 'GET', '/test/state')) as { players: { user: string; name: string; level: number; bot: boolean }[]; bots: string[] };
}

export async function 자리고른사람(admin: APIRequestContext, 자리: number, 이름들: string[], 한도ms = 15_000): Promise<string[]> {
  const 끝 = Date.now() + 한도ms;
  let 고른: string[] = [];
  do {
    const 값 = (await 보내기(admin, 'GET', '/test/state')) as { seats?: { name: string; seat: number; state: string }[] };
    고른 = (값.seats ?? []).filter((x) => x.seat === 자리 && x.state === 'Active').map((x) => x.name);
    if (이름들.every((이름) => 고른.includes(이름))) return 고른;
  } while (Date.now() < 끝);
  return 고른;
}

export async function 봇켜기(admin: APIRequestContext, 봇계정: 계정): Promise<string> {
  await 보내기(admin, 'POST', '/test/bot/start', { user: 봇계정.아이디, pass: 봇계정.비밀번호 });
  return 봇계정.아이디;
}

export async function 손님봇켜기(admin: APIRequestContext, 이름: string): Promise<string> {
  await 보내기(admin, 'POST', '/test/bot/start', { bot: 이름 });
  return 이름;
}

export async function 봇시키기(admin: APIRequestContext, 봇: string, 명령: string): Promise<void> {
  await 보내기(admin, 'POST', '/test/bot/do', { bot: 봇, cmd: 명령 });
}

export async function 봇기록(admin: APIRequestContext, 봇: string, 비우기 = false): Promise<봇줄[]> {
  const 값 = (await 보내기(admin, 'GET', `/test/bot/log?bot=${encodeURIComponent(봇)}${비우기 ? '&clear=1' : ''}`)) as { lines?: 봇줄[] };
  return 값.lines ?? [];
}

export async function 봇기록기다리기(admin: APIRequestContext, 봇: string, 맞나: (줄: 봇줄) => boolean, 한도ms = 15_000): Promise<봇줄 | null> {
  const 끝 = Date.now() + 한도ms;
  do {
    const 찾음 = (await 봇기록(admin, 봇)).find(맞나);
    if (찾음 !== undefined) return 찾음;
  } while (Date.now() < 끝);
  return null;
}

export const 봇줄글 = (줄: 봇줄): string => Object.values(줄.data).map((값) => String(값)).join(' ');

export async function 봇끄기(admin: APIRequestContext, 봇: string): Promise<void> {
  await 보내기(admin, 'POST', '/test/bot/stop', { bot: 봇 });
}

export async function 봇모두끄기(admin: APIRequestContext): Promise<void> {
  await 보내기(admin, 'POST', '/test/bot/stop', { all: true });
}

export async function 실패걸기(admin: APIRequestContext, 경로: string, 횟수 = 1): Promise<void> {
  await 보내기(admin, 'POST', '/test/fail', { path: 경로, count: 횟수 });
}

export async function 접속끊기(admin: APIRequestContext, 아이디: string, 사유?: string): Promise<void> {
  await 보내기(admin, 'POST', '/test/kick', { user: 아이디, ...(사유 === undefined ? {} : { status: 사유 }) });
}

export async function 계정되돌리기(admin: APIRequestContext, 대상: 계정, 방식: 'base' | 'new' = 'base'): Promise<void> {
  await 보내기(admin, 'POST', '/test/reset', { user: 대상.아이디, pass: 대상.비밀번호, mode: 방식 });
}

export async function 캐릭터값넣기(admin: APIRequestContext, 대상: 계정, 값: { level?: number; charName?: string }): Promise<void> {
  await 보내기(admin, 'POST', '/test/reset', { user: 대상.아이디, pass: 대상.비밀번호, mode: 'raw', ...값 });
}

export async function 기록없는첨부우편(admin: APIRequestContext, 대상: 계정, 제목: string): Promise<void> {
  await 보내기(admin, 'POST', '/test/mail', { user: 대상.아이디, pass: 대상.비밀번호, cmd: 제목 });
}

export async function 계정상태(admin: APIRequestContext, 아이디: string): Promise<{ id: number; suspended: boolean; chatMuted: boolean }> {
  const 값 = (await 보내기(admin, 'GET', `${운영}/users?q=${encodeURIComponent(아이디)}`)) as { items?: { id: number; suspended: boolean; chatMuted: boolean; loginId?: string }[] };
  const 줄 = (값.items ?? []).find((x) => x.loginId === undefined || x.loginId === 아이디) ?? 값.items?.[0];
  if (줄 === undefined) throw new Error(`운영툴에서 계정 ${아이디} 를 못 찾았습니다`);
  return 줄;
}

export async function 캐릭터(admin: APIRequestContext, 이름: string): Promise<캐릭터값> {
  const 값 = (await 보내기(admin, 'GET', `${운영}/characters?q=${encodeURIComponent(이름)}`)) as {
    id: number;
    level: number;
    name?: string;
    currencies?: { CurrencyName: string; Amount: number }[];
    items?: Record<string, number>;
  }[];
  const 줄 = 값.find((x) => x.name === undefined || x.name === 이름) ?? 값[0];
  if (줄 === undefined) throw new Error(`운영툴에서 캐릭터 ${이름} 을 못 찾았습니다`);
  const 골드 = (줄.currencies ?? []).find((c) => c.CurrencyName === 'Gold')?.Amount ?? 0;
  return { id: 줄.id, level: 줄.level, 골드, 아이템: 줄.items ?? {} };
}

export async function 우편보내기(
  admin: APIRequestContext,
  캐릭터번호: number,
  우편: { 제목: string; 본문?: string; 아이템?: { 이름: string; 개수: number }[]; 골드?: number },
): Promise<number> {
  const 값 = (await 보내기(admin, 'POST', `${운영}/grants`, {
    characterIds: [캐릭터번호],
    subject: 우편.제목,
    body: 우편.본문 ?? '[QA] 자동 시험 우편',
    items: (우편.아이템 ?? []).map((x) => ({ itemName: x.이름, quantity: x.개수 })),
    currencyAmount: 우편.골드 ?? 0,
    reason: '[QA] 자동 시험',
  })) as { id?: number; grantId?: number };
  const 번호 = 값.id ?? 값.grantId;
  if (번호 === undefined) throw new Error('우편 지급 응답에 지급 번호가 없습니다');
  return 번호;
}

export async function 지급회수(admin: APIRequestContext, 지급번호: number): Promise<void> {
  await 보내기(admin, 'POST', `${운영}/grants/${String(지급번호)}/recall`, { reason: '[QA] 자동 시험 회수' });
}

export async function 지급이력(admin: APIRequestContext, 개수 = 20): Promise<Record<string, unknown>[]> {
  const 값 = (await 보내기(admin, 'GET', `${운영}/grants?size=${String(개수)}`)) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
  return Array.isArray(값) ? 값 : (값.items ?? []);
}

export async function 제재걸기(admin: APIRequestContext, 계정번호: number, 종류: 'SUSPEND' | 'CHAT_MUTE', 사유: string, 끝?: Date): Promise<number> {
  const 값 = (await 보내기(admin, 'POST', `${운영}/users/${String(계정번호)}/sanctions`, {
    type: 종류,
    reason: 사유,
    ...(끝 === undefined ? {} : { endsAt: 끝.toISOString() }),
  })) as { id: number };
  return 값.id;
}

export async function 제재풀기(admin: APIRequestContext, 제재번호: number): Promise<void> {
  await 보내기(admin, 'POST', `${운영}/sanctions/${String(제재번호)}/release`, { reason: '[QA] 자동 시험 해제' });
}

export async function 점검켜기(admin: APIRequestContext, 점검: { 안내: string; 끝?: Date; 허용계정번호?: number[] }): Promise<void> {
  await 보내기(admin, 'PUT', `${운영}/maintenance`, {
    enabled: true,
    message: 점검.안내,
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: 점검.끝 === undefined ? null : 점검.끝.toISOString(),
    allowedAccountIds: 점검.허용계정번호 ?? [],
  });
}

export async function 점검끄기(admin: APIRequestContext): Promise<void> {
  await 보내기(admin, 'PUT', `${운영}/maintenance`, { enabled: false, message: '', startsAt: null, endsAt: null, allowedAccountIds: [] });
}

export async function 공지만들기(admin: APIRequestContext, 제목: string, 본문: string): Promise<number> {
  if (!제목.startsWith('[QA]')) throw new Error('시험 공지 제목은 [QA] 로 시작해야 합니다');
  const 값 = (await 보내기(admin, 'POST', `${운영}/notices`, {
    title: 제목,
    body: 본문,
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    enabled: true,
  })) as { id: number };
  return 값.id;
}

export async function QA공지모두지우기(admin: APIRequestContext): Promise<void> {
  const 값 = (await 보내기(admin, 'GET', `${운영}/notices`)) as { items?: { id: number; title: string }[] } | { id: number; title: string }[];
  const 목록 = Array.isArray(값) ? 값 : (값.items ?? []);
  for (const 공지 of 목록.filter((x) => x.title.startsWith('[QA]'))) {
    await 보내기(admin, 'DELETE', `${운영}/notices/${String(공지.id)}`);
  }
}

const 색떼기 = (글: string): string => 글.replace(/<[^>]+>/g, '').trim();

export async function 열린창닫기(game: GameDriver): Promise<void> {
  for (const 이름 of 창이름) {
    if ((await game.find(`/Showcase HUD/Window ${이름}`)) !== null) {
      await game.click(`/Showcase HUD/Window ${이름}/Panel ${이름}/Button 닫기`);
      await game.waitFor(`/Showcase HUD/Window ${이름}`, { gone: true, timeoutMs: 5_000 });
    }
  }
}

async function 채팅창열기(game: GameDriver): Promise<void> {
  if ((await game.find(채팅창)) === null) {
    await 열린창닫기(game);
    await game.click('ChatStrip');
    await game.waitFor(`${채팅창}/Panel 채팅/Button 보내기`, { timeoutMs: 10_000 });
  }
  await game.click(`${채팅창}/Panel 채팅/Button 전체`);
}

async function 명령보내기(game: GameDriver, 명령: string, 알림글: string): Promise<void> {
  const 알림 = `/Showcase HUD/Toasts/*/Text[contains(@text,${알림글})][-1]`;
  if ((await game.find(알림)) !== null) await game.waitFor(알림, { gone: true, timeoutMs: 10_000 });
  await 채팅창열기(game);
  await game.type('Input 메시지 입력 (100자)', 명령);
  await game.click(`${채팅창}/Panel 채팅/Button 보내기`);
  await game.waitFor(알림, { timeoutMs: 30_000 });
}

export async function GM명령(game: GameDriver, 명령: string, 알림글?: string): Promise<void> {
  const 이름 = 명령.replace(/^\/gm\s+/, '');
  await 명령보내기(game, 명령, 알림글 ?? 이름.split(' ')[0] ?? 이름);
  await 열린창닫기(game);
}

async function 끝줄번호(game: GameDriver): Promise<number> {
  const 끝 = await game.find(`${채팅줄}[-1]/Text`);
  if (끝 === null) return -1;
  const 맞음 = /Row(?:\[(\d+)\])?\/Text$/.exec(끝.path);
  return 맞음 === null ? -1 : Number(맞음[1] ?? '0');
}

async function 줄글(game: GameDriver, 번호: number): Promise<string | null> {
  const 줄 = await game.find(`${채팅줄}[${String(번호)}]/Text`);
  return 줄 === null ? null : 색떼기(줄.text ?? '');
}

export function GM값풀기(줄들: string[]): Record<string, string> {
  const 값: Record<string, string> = {};
  for (const 줄 of 줄들) {
    const 몸 = 줄.replace(/^.*\[GM\]\s+\S+\s+/, '');
    for (const 맞음 of 몸.matchAll(/([^\s=]+)=(.*?)(?=\s[^\s=]+=|$)/g)) {
      값[맞음[1] ?? ''] = (맞음[2] ?? '').trim();
    }
  }
  return 값;
}

export async function GM상태(game: GameDriver): Promise<Record<string, string>> {
  const 던전 = (await game.find('/BossRoomHudCanvas')) !== null;
  await 명령보내기(game, '/gm stat', 'stat');
  const 마지막글 = 던전 ? '직업=' : '처치=';
  await game.waitFor(`${채팅줄}[-1]/Text`, { text: 마지막글, timeoutMs: 15_000 });
  const 줄들: string[] = [];
  for (let 번호 = await 끝줄번호(game); 번호 >= 0 && 줄들.length < 3; 번호 -= 1) {
    const 글 = await 줄글(game, 번호);
    if (글 === null || !글.includes('[GM] stat')) break;
    줄들.unshift(글);
    if (글.includes('레벨=')) break;
  }
  await 열린창닫기(game);
  return GM값풀기(줄들);
}

export async function GM자료(game: GameDriver, 종류: 'item' | 'monster' | 'skill' | 'bag'): Promise<string[]> {
  await 명령보내기(game, `/gm data ${종류}`, `data ${종류}`);
  await game.waitFor(`${채팅줄}[-1]/Text`, { text: `data ${종류}`, timeoutMs: 15_000 });
  const 끝 = Date.now() + 15_000;
  let 앞글 = '';
  let 같은번 = 0;
  while (Date.now() < 끝 && 같은번 < 3) {
    const 지금글 = (await game.find(`${채팅줄}[-1]/Text`))?.text ?? '';
    if (지금글.includes('끝')) break;
    같은번 = 지금글 === 앞글 ? 같은번 + 1 : 0;
    앞글 = 지금글;
  }
  const 줄들: string[] = [];
  for (let 번호 = await 끝줄번호(game); 번호 >= 0 && 줄들.length < 30; 번호 -= 1) {
    const 글 = await 줄글(game, 번호);
    if (글 === null || !글.includes(`[GM] data ${종류}`)) break;
    if (줄들.length > 0 && 글.includes('끝')) break;
    줄들.unshift(글.replace(/^.*\[GM\]\s+data\s+\S+\s*/, ''));
  }
  await 열린창닫기(game);
  return 줄들;
}

export async function 레벨맞추기(game: GameDriver, 레벨: number): Promise<void> {
  await GM명령(game, `/gm level ${String(레벨)}`, `level ${String(레벨)}`);
}

export async function 골드맞추기(game: GameDriver, 골드: number): Promise<void> {
  await GM명령(game, `/gm gold ${String(골드)}`, `gold ${String(골드)}`);
}

export async function 경험치주기(game: GameDriver, 경험치: number): Promise<void> {
  await GM명령(game, `/gm exp ${String(경험치)}`, `exp +${String(경험치)}`);
}

export async function 퀘스트처음으로(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm quest reset', 'quest');
}

export async function 퀘스트다채우기(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm quest done', 'quest done');
}

export async function 적모두처치(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm killall', 'killall');
}

export async function 불러내기(game: GameDriver, 무엇: 'imp' | 'thrower' | 'boss' | 'pot'): Promise<void> {
  await GM명령(game, `/gm spawn ${무엇}`, `spawn ${무엇}`);
}

export async function 보스방가기(game: GameDriver): Promise<void> {
  await 명령보내기(game, '/gm tp boss', 'tp boss');
  await game.waitFor('/Showcase HUD/Toasts/*/Text[contains(@text,도착)][-1]', { timeoutMs: 40_000 });
  await 열린창닫기(game);
}

export async function 스위치로가기(game: GameDriver): Promise<void> {
  await 명령보내기(game, '/gm tp switch', 'tp switch');
  await game.waitFor('/Showcase HUD/Toasts/*/Text[contains(@text,도착)][-1]', { timeoutMs: 40_000 });
  await 열린창닫기(game);
}

export async function 보스처치(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm killboss', 'killboss');
}

export async function 체력맞추기(game: GameDriver, 체력: number): Promise<void> {
  await GM명령(game, `/gm hp ${String(체력)}`, `hp ${String(체력)}`);
}

export async function 쓰러뜨리기(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm faint', 'faint');
}

export async function 체력채우기(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm heal', 'heal');
}

export async function 무적바꾸기(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm god', 'god');
}

export async function 전리품고정(game: GameDriver, 아이템: string): Promise<void> {
  await GM명령(game, `/gm loot ${아이템}`, 'loot');
}

export async function 전리품원래대로(game: GameDriver): Promise<void> {
  await GM명령(game, '/gm loot off', 'loot');
}
