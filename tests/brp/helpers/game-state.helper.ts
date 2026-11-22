import type { APIRequestContext, APIResponse } from '@playwright/test';

const 운영주소 = 'https://bossroom-api.maxihan.com/opsapi';

type 글묶음 = Record<string, unknown>;

async function 받기(res: APIResponse, 무엇: string): Promise<글묶음> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  const 글 = await res.text();
  return 글 === '' ? {} : (JSON.parse(글) as 글묶음);
}

function 목록(값: unknown): 글묶음[] {
  return Array.isArray(값) ? (값 as 글묶음[]) : [];
}

export interface 접속자 {
  user: string;
  name: string;
  level: number;
  bot: boolean;
}

export interface 서버상태 {
  scene: string;
  clients: number;
  players: 접속자[];
  bots: string[];
}

export async function 접속상태(admin: APIRequestContext): Promise<서버상태> {
  const 몸 = await 받기(await admin.get('/test/state'), '접속 상태 읽기');
  return {
    scene: String(몸['scene'] ?? ''),
    clients: Number(몸['clients'] ?? 0),
    players: 목록(몸['players']).map((p) => ({ user: String(p['user'] ?? ''), name: String(p['name'] ?? ''), level: Number(p['level'] ?? 0), bot: p['bot'] === true })),
    bots: 목록(몸['bots']).map((b) => (typeof b === 'string' ? b : String((b as 글묶음)['name'] ?? ''))),
  };
}

export async function 봇켜기(admin: APIRequestContext, 아이디: string, 비밀번호: string): Promise<string> {
  const 몸 = await 받기(await admin.post('/test/bot/start', { data: { user: 아이디, pass: 비밀번호 }, timeout: 75_000 }), `봇 켜기(${아이디})`);
  if (몸['ok'] !== true) throw new Error(`봇 켜기 실패(${아이디}): ${JSON.stringify(몸)}`);
  return String(몸['bot'] ?? 아이디);
}

export async function 손님봇켜기(admin: APIRequestContext, 이름: string): Promise<string> {
  const 몸 = await 받기(await admin.post('/test/bot/start', { data: { bot: 이름 }, timeout: 75_000 }), `손님 봇 켜기(${이름})`);
  if (몸['ok'] !== true) throw new Error(`손님 봇 켜기 실패(${이름}): ${JSON.stringify(몸)}`);
  return String(몸['bot'] ?? 이름);
}

export async function 봇시키기(admin: APIRequestContext, 봇: string, 명령: string): Promise<글묶음> {
  return 받기(await admin.post('/test/bot/do', { data: { bot: 봇, cmd: 명령 } }), `봇 시키기(${봇} · ${명령})`);
}

export interface 봇기록줄 {
  type: string;
  data: 글묶음;
}

export async function 봇기록(admin: APIRequestContext, 봇: string): Promise<봇기록줄[]> {
  const 몸 = await 받기(await admin.get(`/test/bot/log?bot=${encodeURIComponent(봇)}`), `봇 기록 읽기(${봇})`);
  return 목록(몸['lines']).map((l) => ({ type: String(l['type'] ?? ''), data: (l['data'] ?? {}) as 글묶음 }));
}

export function 줄글(줄: 봇기록줄): string {
  return Object.values(줄.data)
    .filter((v) => typeof v === 'string')
    .join(' ');
}

export async function 봇기록기다리기(admin: APIRequestContext, 봇: string, 맞나: (줄: 봇기록줄) => boolean, 한도ms = 15_000): Promise<봇기록줄 | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 맞은 = (await 봇기록(admin, 봇)).find(맞나);
    if (맞은 !== undefined) return 맞은;
    if (Date.now() > 끝) return null;
    await admin.get('/test/state');
  }
}

export async function 봇끄기(admin: APIRequestContext, 봇: string): Promise<void> {
  await 받기(await admin.post('/test/bot/stop', { data: { bot: 봇 } }), `봇 끄기(${봇})`);
}

export async function 봇모두끄기(admin: APIRequestContext): Promise<void> {
  await 받기(await admin.post('/test/bot/stop', { data: { all: true } }), '봇 모두 끄기');
}

export async function 실패걸기(admin: APIRequestContext, 경로: string, 횟수 = 1): Promise<void> {
  await 받기(await admin.post('/test/fail', { data: { path: 경로, count: 횟수 } }), `실패 걸기(${경로})`);
}

export async function 접속끊기(admin: APIRequestContext, 아이디: string, 사유?: string): Promise<void> {
  await 받기(await admin.post('/test/kick', { data: 사유 === undefined ? { user: 아이디 } : { user: 아이디, status: 사유 } }), `접속 끊기(${아이디})`);
}

export async function 계정되돌리기(admin: APIRequestContext, 아이디: string, 비밀번호: string, 방식: 'base' | 'new'): Promise<void> {
  await 로비로되돌리기(admin);
  await 받기(await admin.post('/test/reset', { data: { user: 아이디, pass: 비밀번호, mode: 방식 }, timeout: 30_000 }), `계정 되돌리기(${아이디} · ${방식})`);
}

export async function 캐릭터값넣기(admin: APIRequestContext, 아이디: string, 비밀번호: string, 값: { level?: number; charName?: string }): Promise<void> {
  await 받기(await admin.post('/test/reset', { data: { user: 아이디, pass: 비밀번호, mode: 'raw', ...값 }, timeout: 30_000 }), `캐릭터 값 넣기(${아이디})`);
}

export async function 기록없는우편(admin: APIRequestContext, 아이디: string, 비밀번호: string, 제목: string): Promise<void> {
  await 받기(await admin.post('/test/mail', { data: { user: 아이디, pass: 비밀번호, cmd: 제목 } }), `기록 없는 첨부 우편(${아이디})`);
}

export async function 로비로되돌리기(admin: APIRequestContext): Promise<void> {
  await 받기(await admin.post('/test/lobby', { timeout: 30_000 }), '방을 로비로');
}

export async function 계정번호(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 몸 = await 받기(await admin.get(`${운영주소}/users?q=${encodeURIComponent(아이디)}`), `계정 번호 찾기(${아이디})`);
  const 맞은 = 목록(몸['items']).find((u) => Object.values(u).includes(아이디)) ?? 목록(몸['items'])[0];
  if (맞은 === undefined) throw new Error(`계정을 못 찾았습니다(${아이디})`);
  return Number(맞은['id']);
}

export interface 캐릭터값 {
  id: number;
  level: number;
  gold: number;
  items: Record<string, number>;
}

export async function 캐릭터읽기(admin: APIRequestContext, 이름: string): Promise<캐릭터값> {
  const res = await admin.get(`${운영주소}/characters?q=${encodeURIComponent(이름)}`);
  if (!res.ok()) throw new Error(`캐릭터 읽기 실패(${이름}): ${String(res.status())} ${await res.text()}`);
  const 몸 = (await res.json()) as unknown;
  const 줄들 = Array.isArray(몸) ? (몸 as 글묶음[]) : 목록((몸 as 글묶음)['items']);
  const 맞은 = 줄들.find((c) => c['name'] === 이름 || c['charName'] === 이름) ?? 줄들[0];
  if (맞은 === undefined) throw new Error(`캐릭터를 못 찾았습니다(${이름})`);
  const 골드 = 목록(맞은['currencies']).find((c) => c['CurrencyName'] === 'Gold');
  return {
    id: Number(맞은['id']),
    level: Number(맞은['level'] ?? 0),
    gold: Number(골드?.['Amount'] ?? 0),
    items: (맞은['items'] ?? {}) as Record<string, number>,
  };
}

export async function 캐릭터값기다리기(admin: APIRequestContext, 이름: string, 맞나: (c: 캐릭터값) => boolean, 한도ms = 25_000): Promise<캐릭터값> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 값 = await 캐릭터읽기(admin, 이름);
    if (맞나(값) || Date.now() > 끝) return 값;
  }
}

export interface 지급내용 {
  제목: string;
  본문?: string;
  아이템?: { itemName: string; quantity: number }[];
  골드?: number;
}

export async function 우편지급(admin: APIRequestContext, 캐릭터번호: number, 내용: 지급내용): Promise<number> {
  const 몸 = await 받기(
    await admin.post(`${운영주소}/grants`, {
      data: {
        characterIds: [캐릭터번호],
        subject: 내용.제목,
        body: 내용.본문 ?? 'QA 자동 시험 우편',
        items: 내용.아이템 ?? [],
        currencyAmount: 내용.골드 ?? 0,
        reason: 'QA 자동 시험',
      },
    }),
    `우편 지급(${내용.제목})`,
  );
  return Number(몸['id']);
}

export async function 지급회수(admin: APIRequestContext, 지급번호: number): Promise<void> {
  await 받기(await admin.post(`${운영주소}/grants/${String(지급번호)}/recall`, { data: { reason: 'QA 자동 시험 회수' } }), `지급 회수(${String(지급번호)})`);
}

export async function 지급이력(admin: APIRequestContext, 크기 = 20): Promise<{ id: number; mails: { status: string }[] }[]> {
  const 몸 = await 받기(await admin.get(`${운영주소}/grants?size=${String(크기)}`), '지급 이력 읽기');
  return 목록(몸['items']).map((g) => ({ id: Number(g['id']), mails: 목록(g['mails']).map((m) => ({ status: String(m['status'] ?? '') })) }));
}

const 흐름종류글: Record<string, string> = { GRANTED: '지급', TAKEN: '수령', RECALLED: '회수' };

export interface 아이템흐름줄 {
  종류: string;
  아이템: string;
  수량: number;
  지급번호: number;
}

export async function 아이템흐름(admin: APIRequestContext, 지급번호: number): Promise<아이템흐름줄[]> {
  const 몸 = await 받기(await admin.get(`${운영주소}/logs/items?size=200`), '아이템 흐름 기록 읽기');
  return 목록(몸['items'])
    .filter((f) => Number(f['grantId']) === 지급번호)
    .map((f) => ({ 종류: 흐름종류글[String(f['kind'])] ?? String(f['kind']), 아이템: String(f['itemName'] ?? ''), 수량: Number(f['quantity'] ?? 0), 지급번호 }));
}

export async function 아이템흐름기다리기(admin: APIRequestContext, 지급번호: number, 종류: string, 한도ms = 20_000): Promise<아이템흐름줄 | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 맞은 = (await 아이템흐름(admin, 지급번호)).find((f) => f.종류 === 종류);
    if (맞은 !== undefined) return 맞은;
    if (Date.now() > 끝) return null;
  }
}

export async function 제재걸기(admin: APIRequestContext, 계정: number, 종류: 'SUSPEND' | 'CHAT_MUTE', 사유: string, 끝?: string): Promise<number> {
  const 몸 = await 받기(
    await admin.post(`${운영주소}/users/${String(계정)}/sanctions`, { data: 끝 === undefined ? { type: 종류, reason: 사유 } : { type: 종류, reason: 사유, endsAt: 끝 } }),
    `제재 걸기(${종류})`,
  );
  return Number(몸['id']);
}

export async function 제재풀기(admin: APIRequestContext, 제재번호: number): Promise<void> {
  const res = await admin.post(`${운영주소}/sanctions/${String(제재번호)}/release`, { data: { reason: 'QA 자동 시험 해제' } });
  if (!res.ok() && res.status() !== 404 && res.status() !== 409) throw new Error(`제재 풀기 실패: ${String(res.status())} ${await res.text()}`);
}

export interface 점검설정 {
  enabled: boolean;
  message?: string;
  startsAt?: string;
  endsAt?: string;
  allowedAccountIds?: number[];
}

export async function 점검바꾸기(admin: APIRequestContext, 설정: 점검설정): Promise<void> {
  await 받기(
    await admin.put(`${운영주소}/maintenance`, { data: { message: '', allowedAccountIds: [], ...설정 } }),
    `점검 ${설정.enabled ? '켜기' : '끄기'}`,
  );
}

export async function 점검끄기(admin: APIRequestContext): Promise<void> {
  await 점검바꾸기(admin, { enabled: false });
}

export async function 공지올리기(admin: APIRequestContext, 제목: string, 본문: string): Promise<number> {
  const 지금 = Date.now();
  const 몸 = await 받기(
    await admin.post(`${운영주소}/notices`, {
      data: { title: 제목, body: 본문, startsAt: new Date(지금 - 60_000).toISOString(), endsAt: new Date(지금 + 3_600_000).toISOString(), enabled: true },
    }),
    `공지 올리기(${제목})`,
  );
  return Number(몸['id']);
}

export async function QA공지모두지우기(admin: APIRequestContext): Promise<void> {
  const res = await admin.get(`${운영주소}/notices`);
  if (!res.ok()) throw new Error(`공지 목록 읽기 실패: ${String(res.status())} ${await res.text()}`);
  const 몸 = (await res.json()) as unknown;
  const 줄들 = Array.isArray(몸) ? (몸 as 글묶음[]) : 목록((몸 as 글묶음)['items']);
  for (const 공지 of 줄들.filter((n) => String(n['title'] ?? '').startsWith('[QA]'))) {
    const 지움 = await admin.delete(`${운영주소}/notices/${String(공지['id'])}`);
    if (!지움.ok() && 지움.status() !== 404) throw new Error(`공지 지우기 실패: ${String(지움.status())} ${await 지움.text()}`);
  }
}

export async function 공지지우기(admin: APIRequestContext, 공지번호: number): Promise<void> {
  const res = await admin.delete(`${운영주소}/notices/${String(공지번호)}`);
  if (!res.ok() && res.status() !== 404) throw new Error(`공지 지우기 실패: ${String(res.status())} ${await res.text()}`);
}
