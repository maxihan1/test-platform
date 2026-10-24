import type { APIRequestContext, APIResponse } from '@playwright/test';

export type 직업 = 'Warrior' | 'Archer' | 'Mage';
export type 구역 = 'Town' | 'Beginner' | 'Intermediate' | 'Boss';

export interface 계정 {
  아이디: string;
  비밀번호: string;
  토큰: string;
  리프레시: string;
}

export interface 캐릭터 extends 계정 {
  id: number;
  이름: string;
  직업: 직업;
}

export interface 스탯 {
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
}

export interface 성향 {
  value: number;
  state: 'Innocent' | 'Purple' | 'Chaotic';
  purpleUntil: string | null;
}

export interface 캐릭터정보 {
  id: number;
  name: string;
  classType: 직업;
  gender: string;
  level: number;
  exp: number;
  expToNext: number;
  gold: number;
  position: { x: number; y: number; z: number };
  zone: 구역;
  stats: 스탯;
  alignment: 성향;
  pkKills: number;
  pkDeaths: number;
}

export interface 아이템 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  equippedSlot: string | null;
  sellPrice: number;
}

export interface 가방정보 {
  capacity: number;
  used: number;
  gold: number;
  items: 아이템[];
}

export interface 봇정보 {
  id: number;
  name: string;
  classType: 직업;
  level: number;
  zone: 구역;
  temperament: string;
  alignment: 성향;
  isDead: boolean;
  respawnAt: string | null;
  equipment: 아이템[];
  itemCount: number;
}

export interface 스폰정보 {
  id: string;
  zone: 구역;
  monster: string;
  x: number;
  z: number;
}

export interface 바닥아이템정보 {
  id: number;
  templateId: string;
  quantity: number;
  enhanceLevel: number;
  zone: 구역;
  x: number;
  z: number;
  expiresAt: string;
}

export interface 강화확률 {
  targetLevel: number;
  success: number;
  fail: number;
  destroy: number;
}

export const 구역자리: Record<구역, { x: number; z: number }> = {
  Town: { x: 200, z: 40 },
  Beginner: { x: 100, z: 150 },
  Intermediate: { x: 100, z: 250 },
  Boss: { x: 200, z: 360 },
};

const 글자들 = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function 임의글자(길이: number): string {
  let 글 = '';
  for (let i = 0; i < 길이; i += 1) 글 += 글자들[Math.floor(Math.random() * 글자들.length)];
  return 글;
}

export function 임의아이디(머리: string): string {
  return `${머리}${임의글자(Math.max(4, 14 - 머리.length))}`.slice(0, 16);
}

export function 임의이름(): string {
  return `q${임의글자(8)}`;
}

async function 본문<T>(res: APIResponse, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  const 글 = await res.text();
  return (글 === '' ? undefined : JSON.parse(글)) as T;
}

export function 플레이어머리(누구: 계정 | 캐릭터): Record<string, string> {
  const 머리: Record<string, string> = { authorization: `Bearer ${누구.토큰}` };
  if ('id' in 누구) 머리['x-character-id'] = String(누구.id);
  return 머리;
}

export async function 가입만(admin: APIRequestContext, 아이디: string, 비밀번호: string): Promise<APIResponse> {
  return admin.post('/auth/signup', { data: { username: 아이디, password: 비밀번호 } });
}

export async function 새계정(admin: APIRequestContext, 머리: string): Promise<계정> {
  const 아이디 = 임의아이디(머리);
  const 비밀번호 = `p${임의글자(11)}`;
  await 본문(await 가입만(admin, 아이디, 비밀번호), `${아이디} 가입`);
  const 토큰 = await 본문<{ accessToken: string; refreshToken: string }>(
    await admin.post('/auth/login', { data: { username: 아이디, password: 비밀번호 } }),
    `${아이디} 로그인`,
  );
  return { 아이디, 비밀번호, 토큰: 토큰.accessToken, 리프레시: 토큰.refreshToken };
}

export async function 캐릭터더하기(admin: APIRequestContext, 누구: 계정, 직업: 직업 = 'Warrior', 이름: string = 임의이름()): Promise<캐릭터> {
  const 만든 = await 본문<캐릭터정보>(
    await admin.post('/characters', { headers: 플레이어머리(누구), data: { name: 이름, classType: 직업, gender: 'Male' } }),
    `${누구.아이디} 캐릭터 만들기`,
  );
  return { 아이디: 누구.아이디, 비밀번호: 누구.비밀번호, 토큰: 누구.토큰, 리프레시: 누구.리프레시, id: 만든.id, 이름: 만든.name, 직업 };
}

export async function 새캐릭터(admin: APIRequestContext, 머리: string, 직업: 직업 = 'Warrior'): Promise<캐릭터> {
  return 캐릭터더하기(admin, await 새계정(admin, 머리), 직업);
}

export async function 계정지우기(admin: APIRequestContext, 누구: 계정 | string): Promise<void> {
  const 아이디 = typeof 누구 === 'string' ? 누구 : 누구.아이디;
  await 본문(await admin.post('/admin/cleanup', { data: { usernamePrefix: 아이디 } }), `${아이디} 정리`);
}

export async function 머리로정리(admin: APIRequestContext, 머리: string): Promise<{ accountsDeleted: number; charactersDeleted: number }> {
  if (머리.length < 3 || 머리.startsWith('qh')) throw new Error(`정리 앞머리 ${머리} 는 쓰지 않는다`);
  return 본문(await admin.post('/admin/cleanup', { data: { usernamePrefix: 머리 } }), `${머리} 정리`);
}

export async function 캐릭터읽기(admin: APIRequestContext, 누구: 캐릭터): Promise<캐릭터정보> {
  return 본문(await admin.get(`/admin/characters/${String(누구.id)}`), `${누구.이름} 읽기`);
}

export async function 바꾸기(
  admin: APIRequestContext,
  누구: 캐릭터,
  바꿀것: { gold?: number; level?: number; exp?: number; alignment?: number; clearPurple?: boolean; x?: number; z?: number },
): Promise<캐릭터정보> {
  return 본문(await admin.patch(`/admin/characters/${String(누구.id)}`, { data: 바꿀것 }), `${누구.이름} 바꾸기`);
}

export async function 순간이동(admin: APIRequestContext, 누구: 캐릭터, 곳: 구역 | { x: number; z: number }): Promise<캐릭터정보> {
  return 바꾸기(admin, 누구, typeof 곳 === 'string' ? 구역자리[곳] : 곳);
}

export async function 초기화(admin: APIRequestContext, 누구: 캐릭터): Promise<캐릭터정보> {
  return 본문(await admin.post(`/admin/characters/${String(누구.id)}/reset`), `${누구.이름} 초기화`);
}

export async function 가방(admin: APIRequestContext, 누구: 캐릭터): Promise<가방정보> {
  return 본문(await admin.get(`/admin/characters/${String(누구.id)}/inventory`), `${누구.이름} 가방 읽기`);
}

export async function 아이템주기(
  admin: APIRequestContext,
  누구: 캐릭터,
  templateId: string,
  옵션: { 수량?: number; 강화?: number } = {},
): Promise<가방정보> {
  return 본문(
    await admin.post(`/admin/characters/${String(누구.id)}/items`, {
      data: { templateId, quantity: 옵션.수량 ?? 1, enhanceLevel: 옵션.강화 ?? 0 },
    }),
    `${누구.이름} 에게 ${templateId} 주기`,
  );
}

export async function 새아이템주기(admin: APIRequestContext, 누구: 캐릭터, templateId: string, 옵션: { 수량?: number; 강화?: number } = {}): Promise<아이템> {
  const 앞 = new Set((await 가방(admin, 누구)).items.map((i) => i.id));
  const 뒤 = await 아이템주기(admin, 누구, templateId, 옵션);
  const 새것 = 뒤.items.find((i) => !앞.has(i.id) && i.templateId === templateId);
  if (새것 === undefined) throw new Error(`${templateId} 를 준 뒤 가방에서 새 아이템을 못 찾았다`);
  return 새것;
}

export async function 아이템지우기(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<가방정보> {
  return 본문(await admin.delete(`/admin/characters/${String(누구.id)}/items/${String(아이템번호)}`), `${누구.이름} 아이템 ${String(아이템번호)} 지우기`);
}

export async function 장비빼고비우기(admin: APIRequestContext, 누구: 캐릭터): Promise<가방정보> {
  let 지금 = await 가방(admin, 누구);
  for (const i of 지금.items.filter((x) => x.equippedSlot === null)) 지금 = await 아이템지우기(admin, 누구, i.id);
  return 지금;
}

export async function 가방채우기(admin: APIRequestContext, 누구: 캐릭터, 남길칸 = 0): Promise<가방정보> {
  let 지금 = await 가방(admin, 누구);
  while (지금.used < 지금.capacity - 남길칸) 지금 = await 아이템주기(admin, 누구, 'gloves_leather');
  return 지금;
}

export async function 장착(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number): Promise<{ inventory: 가방정보; stats: 스탯 }> {
  return 본문(
    await admin.post(`/characters/${String(누구.id)}/equip`, { headers: 플레이어머리(누구), data: { itemId: 아이템번호 } }),
    `${누구.이름} 아이템 ${String(아이템번호)} 장착`,
  );
}

export async function 결과고정(
  admin: APIRequestContext,
  고정: { enhance?: ('Success' | 'Fail' | 'Destroy')[]; botLoot?: boolean[]; deathDrop?: boolean[] },
): Promise<{ enhance: string[]; botLoot: boolean[]; deathDrop: boolean[] }> {
  return 본문(await admin.post('/admin/forced', { data: 고정 }), '결과 고정');
}

export async function 고정목록(admin: APIRequestContext): Promise<{ enhance: string[]; botLoot: boolean[]; deathDrop: boolean[] }> {
  return 본문(await admin.get('/admin/forced'), '고정 목록 읽기');
}

export async function 고정비우기(admin: APIRequestContext): Promise<void> {
  await 본문(await admin.delete('/admin/forced'), '결과 고정 비우기');
}

export async function 어드민설정(admin: APIRequestContext): Promise<{
  enhance: { safeLevel: number; maxLevel: number; goldCostPerLevel: number; rates: 강화확률[] };
  drop: {
    botLootChance: number;
    botLootChanceChaotic: number;
    groundItemLifetimeSeconds: number;
    deathDrop: { maxAlignment: number; chance: number; includeEquipped: boolean }[];
  };
  forced: { enhance: string[]; botLoot: boolean[]; deathDrop: boolean[] };
}> {
  return 본문(await admin.get('/admin/config'), '어드민 설정 읽기');
}

export async function 강화확률바꾸기(admin: APIRequestContext, rates: 강화확률[]): Promise<unknown> {
  return 본문(await admin.put('/admin/config/enhance-rates', { data: { rates } }), '강화 확률 바꾸기');
}

export async function 강화확률되돌리기(admin: APIRequestContext): Promise<unknown> {
  return 본문(await admin.put('/admin/config/enhance-rates', { data: { reset: true } }), '강화 확률 되돌리기');
}

export async function 드랍확률바꾸기(
  admin: APIRequestContext,
  바꿀것: { botLootChance?: number; botLootChanceChaotic?: number; deathDrop?: { maxAlignment: number; chance: number; includeEquipped: boolean }[] },
): Promise<unknown> {
  return 본문(await admin.put('/admin/config/drop-rates', { data: 바꿀것 }), '드랍 확률 바꾸기');
}

export async function 드랍확률되돌리기(admin: APIRequestContext): Promise<unknown> {
  return 본문(await admin.put('/admin/config/drop-rates', { data: { reset: true } }), '드랍 확률 되돌리기');
}

export async function 월드다시두기(admin: APIRequestContext, 곳?: 구역): Promise<{ groundItemsDeleted: number; botCount: number }> {
  return 본문(await admin.post('/admin/world/reset', { data: 곳 === undefined ? {} : { zone: 곳 } }), '월드 다시 두기');
}

export async function 스폰목록(admin: APIRequestContext): Promise<스폰정보[]> {
  return 본문(await admin.get('/admin/spawns'), '스폰 목록 읽기');
}

export async function 스폰되돌리기(admin: APIRequestContext): Promise<{ count: number }> {
  return 본문(await admin.post('/admin/spawns/reset'), '스폰 표 되돌리기');
}

export async function 봇목록(admin: APIRequestContext, 누구: 계정 | 캐릭터, 곳?: 구역): Promise<봇정보[]> {
  return 본문(await admin.get(곳 === undefined ? '/bots' : `/bots?zone=${곳}`, { headers: 플레이어머리(누구) }), '봇 목록 읽기');
}

export async function 산봇들(admin: APIRequestContext, 누구: 계정 | 캐릭터, 곳: 구역, 상태?: 성향['state']): Promise<봇정보[]> {
  return (await 봇목록(admin, 누구, 곳)).filter((b) => !b.isDead && (상태 === undefined || b.alignment.state === 상태));
}

export async function 봇악명만들기(admin: APIRequestContext, 머리: string, 봇: 봇정보): Promise<void> {
  const 희생 = await 새캐릭터(admin, 머리);
  try {
    await 순간이동(admin, 희생, 'Beginner');
    await 본문(
      await admin.post('/combat/player-death', {
        headers: 플레이어머리(희생),
        data: { killerType: 'Bot', killerId: String(봇.id), x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
      }),
      `봇 ${봇.name} 이 선량한 캐릭터를 죽였다고 보고`,
    );
  } finally {
    await 계정지우기(admin, 희생);
  }
}

export async function 바닥아이템만들기(admin: APIRequestContext, 머리: string, templateId = 'potion_mp_s'): Promise<{ 떨군이: 캐릭터; 바닥: 바닥아이템정보 }> {
  const 떨군이 = await 새캐릭터(admin, 머리);
  await 장비빼고비우기(admin, 떨군이);
  await 아이템주기(admin, 떨군이, templateId, { 수량: 3 });
  await 순간이동(admin, 떨군이, 'Beginner');
  await 결과고정(admin, { deathDrop: [true] });
  try {
    const 죽음 = await 본문<{ dropped: 바닥아이템정보 | null }>(
      await admin.post('/combat/player-death', {
        headers: 플레이어머리(떨군이),
        data: { killerType: 'Monster', killerId: '1', x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
      }),
      '바닥 아이템을 떨어뜨리려고 사망 보고',
    );
    if (죽음.dropped === null) throw new Error('드랍을 고정했는데 아무것도 안 떨어졌다');
    return { 떨군이, 바닥: 죽음.dropped };
  } finally {
    await 고정비우기(admin);
  }
}

export async function 될때까지<T>(시도: () => Promise<T | undefined>, 한도ms: number, 간격ms = 500): Promise<T> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 값 = await 시도();
    if (값 !== undefined) return 값;
    if (Date.now() >= 끝) throw new Error(`${String(한도ms / 1000)}초 안에 기다린 일이 일어나지 않았다`);
    await new Promise((풀림) => setTimeout(풀림, 간격ms));
  }
}

export interface 강화응답 {
  result: 'Success' | 'Fail' | 'Destroy';
  item: 아이템 | null;
  fromLevel: number;
  toLevel: number;
  goldSpent: number;
  inventory: 가방정보;
}

export async function 강화하기(admin: APIRequestContext, 누구: 캐릭터, 아이템번호: number, 주문서번호: number): Promise<APIResponse> {
  return admin.post('/enhance', { headers: 플레이어머리(누구), data: { itemId: 아이템번호, scrollId: 주문서번호 } });
}

function 주문서찾기(지금: 가방정보, templateId: string): 아이템 | undefined {
  return 지금.items.find((i) => i.templateId === templateId && i.quantity > 0);
}

export async function 강화되풀이(
  admin: APIRequestContext,
  누구: 캐릭터,
  templateId: string,
  목표: number,
  횟수: number,
): Promise<{ 성공: number; 실패: number; 파괴: number }> {
  const 셈 = { 성공: 0, 실패: 0, 파괴: 0 };
  const 주문서종류 = templateId.startsWith('sword') || templateId.startsWith('bow') || templateId.startsWith('staff') || templateId.startsWith('axe') ? 'scroll_weapon' : 'scroll_armor';
  await 바꾸기(admin, 누구, { gold: 100 * 목표 * 횟수 + 1000 });
  let 아이템번호 = (await 새아이템주기(admin, 누구, templateId, { 강화: 목표 - 1 })).id;
  let 지금 = await 아이템주기(admin, 누구, 주문서종류, { 수량: Math.min(999, 횟수) });
  for (let i = 0; i < 횟수; i += 1) {
    let 주문서 = 주문서찾기(지금, 주문서종류);
    if (주문서 === undefined) {
      지금 = await 아이템주기(admin, 누구, 주문서종류, { 수량: Math.min(999, 횟수 - i) });
      주문서 = 주문서찾기(지금, 주문서종류);
      if (주문서 === undefined) throw new Error('주문서를 다시 줬는데 가방에 없다');
    }
    const 몸 = await 본문<강화응답>(await 강화하기(admin, 누구, 아이템번호, 주문서.id), `${String(i + 1)}번째 강화`);
    지금 = 몸.inventory;
    if (몸.result === 'Fail') {
      셈.실패 += 1;
      continue;
    }
    if (몸.result === 'Success') {
      셈.성공 += 1;
      지금 = await 아이템지우기(admin, 누구, 아이템번호);
    } else {
      셈.파괴 += 1;
    }
    아이템번호 = (await 새아이템주기(admin, 누구, templateId, { 강화: 목표 - 1 })).id;
    지금 = await 가방(admin, 누구);
  }
  return 셈;
}

export interface 사망응답 {
  expLost: number;
  dropped: 바닥아이템정보 | null;
  character: 캐릭터정보;
}

export async function 사망보고(
  admin: APIRequestContext,
  누구: 캐릭터,
  죽인이: { killerType: 'Monster' | 'Bot' | 'Guard'; killerId: string } = { killerType: 'Monster', killerId: '1' },
  곳: { x: number; z: number } = 구역자리.Beginner,
): Promise<APIResponse> {
  return admin.post('/combat/player-death', { headers: 플레이어머리(누구), data: { ...죽인이, x: 곳.x, z: 곳.z } });
}

export async function 사망되풀이(
  admin: APIRequestContext,
  누구: 캐릭터,
  횟수: number,
  templateId = 'potion_hp_s',
): Promise<{ 떨어짐: number; 안떨어짐: number }> {
  const 셈 = { 떨어짐: 0, 안떨어짐: 0 };
  for (let i = 0; i < 횟수; i += 1) {
    const 몸 = await 본문<사망응답>(await 사망보고(admin, 누구), `${String(i + 1)}번째 사망 보고`);
    if (몸.dropped === null) {
      셈.안떨어짐 += 1;
      continue;
    }
    셈.떨어짐 += 1;
    await 아이템주기(admin, 누구, 몸.dropped.templateId, { 수량: 몸.dropped.quantity, 강화: 몸.dropped.enhanceLevel });
    if ((await 가방(admin, 누구)).items.every((x) => x.templateId !== templateId)) await 아이템주기(admin, 누구, templateId, { 수량: 10 });
  }
  return 셈;
}

export interface 봇처치응답 {
  dropped: 아이템 | null;
  droppedToGround: boolean;
  groundItemId: number | null;
  alignmentDelta: number;
  character: 캐릭터정보;
  bot: 봇정보;
}

export async function 봇처치(admin: APIRequestContext, 누구: 캐릭터, 봇번호: number, 곳: { x: number; z: number } = 구역자리.Beginner): Promise<APIResponse> {
  return admin.post('/combat/bot-kill', { headers: 플레이어머리(누구), data: { botId: 봇번호, x: 곳.x, z: 곳.z } });
}

export async function 봇처치되풀이(
  admin: APIRequestContext,
  누구: 캐릭터,
  횟수: number,
  상태: 성향['state'] = 'Innocent',
): Promise<{ 얻음: number; 못얻음: number }> {
  const 셈 = { 얻음: 0, 못얻음: 0 };
  let 남은: 봇정보[] = [];
  for (let i = 0; i < 횟수; i += 1) {
    if (남은.length === 0) {
      남은 = await 산봇들(admin, 누구, 'Beginner', 상태);
      if (남은.length === 0) {
        await 월드다시두기(admin, 'Beginner');
        남은 = await 산봇들(admin, 누구, 'Beginner', 상태);
      }
      if (남은.length === 0) throw new Error(`초록 들판에 살아 있는 ${상태} 봇이 없다`);
    }
    const 봇 = 남은.shift()!;
    if ((await 가방(admin, 누구)).used >= 39) await 장비빼고비우기(admin, 누구);
    const 몸 = await 본문<봇처치응답>(await 봇처치(admin, 누구, 봇.id), `${String(i + 1)}번째 봇 처치`);
    if (몸.dropped === null) 셈.못얻음 += 1;
    else 셈.얻음 += 1;
  }
  return 셈;
}

export async function 응답몸<T>(res: APIResponse): Promise<T> {
  const 글 = await res.text();
  try {
    return JSON.parse(글) as T;
  } catch {
    throw new Error(`응답 본문이 JSON 이 아니다: ${String(res.status())} ${글.slice(0, 200)}`);
  }
}

export async function 오류코드(res: APIResponse): Promise<string> {
  const 글 = await res.text();
  try {
    const 몸 = JSON.parse(글) as { code?: unknown };
    return typeof 몸.code === 'string' ? 몸.code : '';
  } catch {
    return '';
  }
}

export async function 스폰하나(admin: APIRequestContext, 곳: 구역, 몬스터: string): Promise<스폰정보> {
  const 찾음 = (await 스폰목록(admin)).find((s) => s.zone === 곳 && s.monster === 몬스터);
  if (찾음 === undefined) throw new Error(`${곳} 에 ${몬스터} 스폰이 없다`);
  return 찾음;
}

export async function 몬스터처치(
  admin: APIRequestContext,
  누구: 캐릭터,
  스폰: { id: string; monster: string; x: number; z: number },
  보고: { monsterId?: string; x?: number; z?: number } = {},
): Promise<APIResponse> {
  return admin.post('/combat/monster-kill', {
    headers: 플레이어머리(누구),
    data: { monsterId: 보고.monsterId ?? 스폰.monster, spawnId: 스폰.id, x: 보고.x ?? 스폰.x, z: 보고.z ?? 스폰.z },
  });
}

export async function PK공격(
  admin: APIRequestContext,
  누구: 캐릭터,
  공격자: { kind: 'Character' | 'Bot'; id: number },
  대상: { kind: 'Character' | 'Bot'; id: number },
  곳: { x: number; z: number } = 구역자리.Beginner,
): Promise<APIResponse> {
  return admin.post('/combat/pk-attack', {
    headers: 플레이어머리(누구),
    data: { attackerKind: 공격자.kind, attackerId: 공격자.id, targetKind: 대상.kind, targetId: 대상.id, x: 곳.x, z: 곳.z },
  });
}

export async function 봇선공만들기(admin: APIRequestContext, 누구: 캐릭터, 봇: 봇정보): Promise<void> {
  await 본문(await PK공격(admin, 누구, { kind: 'Bot', id: 봇.id }, { kind: 'Character', id: 누구.id }), `봇 ${봇.name} 이 먼저 공격했다고 보고`);
}

export async function 줍기(admin: APIRequestContext, 누구: 캐릭터, 바닥번호: number, 봇번호?: number, 곳: { x: number; z: number } = 구역자리.Beginner): Promise<APIResponse> {
  return admin.post(`/world/ground-items/${String(바닥번호)}/pickup`, {
    headers: 플레이어머리(누구),
    data: { ...(봇번호 === undefined ? {} : { botId: 봇번호 }), x: 곳.x, z: 곳.z },
  });
}
