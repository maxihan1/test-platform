import type { APIRequestContext } from '@playwright/test';

import { type 가방, type 강화결과, type 구역, 머리, type 바닥아이템, 본문, type 봇, 새계정, type 성향상태, type 스폰, type 원장줄, 인증머리, type 직업, type 캐릭터, 캐릭터만들기, type 캐릭터정보 } from './api.helper.js';

export interface 바꿀값 {
  gold?: number;
  level?: number;
  exp?: number;
  alignment?: number;
  clearPurple?: boolean;
  x?: number;
  z?: number;
}

export interface 강화확률 {
  targetLevel: number;
  success: number;
  fail: number;
  destroy: number;
}

export interface 사망드랍 {
  maxAlignment: number;
  chance: number;
  includeEquipped: boolean;
}

export interface 드랍설정 {
  botLootChance?: number;
  botLootChanceChaotic?: number;
  deathDrop?: 사망드랍[];
}

export interface 설정 {
  enhance: { safeLevel: number; maxLevel: number; goldCostPerLevel: number; rates: 강화확률[] };
  drop: { botLootChance: number; botLootChanceChaotic: number; groundItemLifetimeSeconds: number; deathDrop: 사망드랍[] };
  forced: { enhance: 강화결과[]; botLoot: boolean[]; deathDrop: boolean[] };
}

export const 구역자리: Record<구역, { x: number; z: number }> = {
  Town: { x: 200, z: 30 },
  Beginner: { x: 100, z: 120 },
  Intermediate: { x: 60, z: 260 },
  Boss: { x: 200, z: 360 },
};

const 시나리오안 = (): boolean => process.env.PLATFORM_SCENARIO_MODE === '1';
const 만든캐릭터 = new Map<string, { 누구: 캐릭터; 직업: 직업 }>();
let 들어간: { 누구: 캐릭터; 직업: 직업 } | undefined;
let 넘겨줄수있음 = false;

export function 들어간캐릭터(): 캐릭터 | undefined {
  return 들어간?.누구;
}

export function 게임에들어갔다(아이디: string): void {
  if (!시나리오안()) return;
  들어간 = 만든캐릭터.get(아이디);
  넘겨줄수있음 = 들어간 !== undefined;
}

export async function 새캐릭터(admin: APIRequestContext, 앞머리: string, 직업값: 직업 = 'Warrior'): Promise<캐릭터> {
  if (넘겨줄수있음 && 들어간 !== undefined && 들어간.직업 === 직업값) {
    넘겨줄수있음 = false;
    return 들어간.누구;
  }
  const 누구 = await 캐릭터만들기(admin, await 새계정(admin, 앞머리), 직업값);
  if (시나리오안()) 만든캐릭터.set(누구.아이디, { 누구, 직업: 직업값 });
  return 누구;
}

export async function 계정지우기(admin: APIRequestContext, 아이디: string): Promise<{ accountsDeleted: number; charactersDeleted: number }> {
  if (아이디.length < 3 || 아이디.startsWith('qh')) throw new Error(`지우면 안 되는 앞머리다: ${아이디}`);
  return 본문(await admin.post('/admin/cleanup', { data: { usernamePrefix: 아이디 } }), '계정 지우기');
}

export async function 캐릭터지우기(admin: APIRequestContext, 누구: { 아이디: string }): Promise<{ accountsDeleted: number; charactersDeleted: number }> {
  if (누구.아이디 === 들어간?.누구.아이디) return { accountsDeleted: 0, charactersDeleted: 0 };
  return 계정지우기(admin, 누구.아이디);
}

export async function 캐릭터읽기(admin: APIRequestContext, 누구: { 번호: number }): Promise<캐릭터정보> {
  return 본문(await admin.get(`/admin/characters/${String(누구.번호)}`), '캐릭터 읽기');
}

export async function 캐릭터바꾸기(admin: APIRequestContext, 누구: { 번호: number }, 값: 바꿀값): Promise<캐릭터정보> {
  return 본문(await admin.patch(`/admin/characters/${String(누구.번호)}`, { data: 값 }), '캐릭터 바꾸기');
}

export async function 골드주기(admin: APIRequestContext, 누구: { 번호: number }, 골드: number): Promise<캐릭터정보> {
  return 캐릭터바꾸기(admin, 누구, { gold: 골드 });
}

export async function 레벨주기(admin: APIRequestContext, 누구: { 번호: number }, 레벨: number, 경험치 = 0): Promise<캐릭터정보> {
  return 캐릭터바꾸기(admin, 누구, { level: 레벨, exp: 경험치 });
}

export async function 성향주기(admin: APIRequestContext, 누구: { 번호: number }, 값: number, 보라지우기 = true): Promise<캐릭터정보> {
  return 캐릭터바꾸기(admin, 누구, { alignment: 값, clearPurple: 보라지우기 });
}

export async function 순간이동(admin: APIRequestContext, 누구: { 번호: number }, 어디: 구역 | { x: number; z: number }): Promise<캐릭터정보> {
  const 자리 = typeof 어디 === 'string' ? 구역자리[어디] : 어디;
  return 캐릭터바꾸기(admin, 누구, { x: 자리.x, z: 자리.z });
}

export async function 아이템주기(
  admin: APIRequestContext,
  누구: { 번호: number },
  templateId: string,
  { 수량 = 1, 강화 = 0 }: { 수량?: number; 강화?: number } = {},
): Promise<가방> {
  return 본문(
    await admin.post(`/admin/characters/${String(누구.번호)}/items`, { data: { templateId, quantity: 수량, enhanceLevel: 강화 } }),
    '아이템 주기',
  );
}

export async function 아이템지우기(admin: APIRequestContext, 누구: { 번호: number }, 아이템번호: number): Promise<가방> {
  return 본문(await admin.delete(`/admin/characters/${String(누구.번호)}/items/${String(아이템번호)}`), '아이템 지우기');
}

export async function 가방읽기(admin: APIRequestContext, 누구: { 번호: number }): Promise<가방> {
  return 본문(await admin.get(`/admin/characters/${String(누구.번호)}/inventory`), '가방 읽기');
}

export async function 가방채우기(admin: APIRequestContext, 누구: { 번호: number }, 남길칸 = 0): Promise<가방> {
  let 지금 = await 가방읽기(admin, 누구);
  while (지금.capacity - 지금.used > 남길칸) {
    지금 = await 아이템주기(admin, 누구, 'helm_leather');
  }
  return 지금;
}

export async function 원장읽기(admin: APIRequestContext, 누구: { 번호: number }, 몇 = 50): Promise<원장줄[]> {
  return 본문(await admin.get(`/admin/characters/${String(누구.번호)}/ledger?limit=${String(몇)}`), '원장 읽기');
}

export async function 결과고정(
  admin: APIRequestContext,
  고정: { enhance?: 강화결과[]; botLoot?: boolean[]; deathDrop?: boolean[] },
): Promise<설정['forced']> {
  return 본문(await admin.post('/admin/forced', { data: 고정 }), '결과 고정');
}

export async function 결과고정비우기(admin: APIRequestContext): Promise<설정['forced']> {
  return 본문(await admin.delete('/admin/forced'), '결과 고정 비우기');
}

export async function 설정읽기(admin: APIRequestContext): Promise<설정> {
  return 본문(await admin.get('/admin/config'), '설정 읽기');
}

export async function 강화확률바꾸기(admin: APIRequestContext, 확률: 강화확률[]): Promise<설정['enhance']> {
  return 본문(await admin.put('/admin/config/enhance-rates', { data: { rates: 확률 } }), '강화 확률 바꾸기');
}

export async function 강화확률되돌리기(admin: APIRequestContext): Promise<설정['enhance']> {
  return 본문(await admin.put('/admin/config/enhance-rates', { data: { reset: true } }), '강화 확률 되돌리기');
}

export async function 드랍확률바꾸기(admin: APIRequestContext, 값: 드랍설정): Promise<설정['drop']> {
  return 본문(await admin.put('/admin/config/drop-rates', { data: 값 }), '드랍 확률 바꾸기');
}

export async function 드랍확률되돌리기(admin: APIRequestContext): Promise<설정['drop']> {
  return 본문(await admin.put('/admin/config/drop-rates', { data: { reset: true } }), '드랍 확률 되돌리기');
}

export async function 월드초기화(admin: APIRequestContext, 어디?: 구역): Promise<{ groundItemsDeleted: number; botCount: number }> {
  return 본문(await admin.post('/admin/world/reset', { data: 어디 === undefined ? {} : { zone: 어디 } }), '월드 초기화');
}

export async function 스폰목록(admin: APIRequestContext): Promise<스폰[]> {
  return 본문(await admin.get('/admin/spawns'), '스폰 목록');
}

export async function 스폰되돌리기(admin: APIRequestContext): Promise<{ count: number }> {
  return 본문(await admin.post('/admin/spawns/reset'), '스폰 되돌리기');
}

export async function 스폰세기(admin: APIRequestContext): Promise<Record<string, number>> {
  const 표 = await 스폰목록(admin);
  const 셈: Record<string, number> = {};
  for (const s of 표) 셈[`${s.zone}/${s.monster}`] = (셈[`${s.zone}/${s.monster}`] ?? 0) + 1;
  return 셈;
}

export interface 어드민캐릭터 {
  id: number;
  accountId: number;
  username: string;
  name: string;
  level: number;
  gold: number;
  zone: 구역;
  alignment: number;
  deleted: boolean;
}

export async function 이름으로찾기(admin: APIRequestContext, 이름: string): Promise<어드민캐릭터[]> {
  return 본문(await admin.get(`/admin/characters?name=${encodeURIComponent(이름)}`), '캐릭터 찾기');
}

export async function 번호로아이템주기(admin: APIRequestContext, 번호: number, templateId: string, 수량 = 1, 강화 = 0): Promise<가방> {
  return 아이템주기(admin, { 번호 }, templateId, { 수량, 강화 });
}

export async function 스폰찾기(admin: APIRequestContext, 어디: 구역, 몬스터: 스폰['monster'], 몇째 = 0): Promise<스폰> {
  const 찾은 = (await 스폰목록(admin)).filter((s) => s.zone === 어디 && s.monster === 몬스터);
  const 스폰값 = 찾은[몇째];
  if (스폰값 === undefined) throw new Error(`${어디} 구역에 ${몬스터} 스폰 ${String(몇째 + 1)}번째가 없다`);
  return 스폰값;
}

export async function 스폰앞으로(admin: APIRequestContext, 누구: { 번호: number }, 스폰값: 스폰): Promise<캐릭터정보> {
  return 순간이동(admin, 누구, { x: 스폰값.x, z: 스폰값.z });
}

export async function 봇목록(admin: APIRequestContext, 누구: { 토큰: string }, 어디?: 구역): Promise<봇[]> {
  const 주소 = 어디 === undefined ? '/bots' : `/bots?zone=${어디}`;
  return 본문(await admin.get(주소, { headers: 인증머리(누구) }), '봇 목록');
}

export async function 살아있는봇(admin: APIRequestContext, 누구: { 토큰: string }, 어디: 구역 = 'Beginner', 성향값?: 성향상태): Promise<봇> {
  let 봇들 = (await 봇목록(admin, 누구, 어디)).filter((b) => !b.isDead && (성향값 === undefined || b.alignment.state === 성향값));
  if (봇들.length === 0) {
    await 월드초기화(admin, 어디);
    봇들 = (await 봇목록(admin, 누구, 어디)).filter((b) => !b.isDead && (성향값 === undefined || b.alignment.state === 성향값));
  }
  const 봇값 = 봇들[0];
  if (봇값 === undefined) throw new Error(`${어디} 구역에 살아 있는 ${성향값 ?? ''} 봇이 없다`);
  return 봇값;
}

export async function 봇읽기(admin: APIRequestContext, 누구: { 토큰: string }, 봇번호: number): Promise<봇> {
  const 찾은 = (await 봇목록(admin, 누구)).find((b) => b.id === 봇번호);
  if (찾은 === undefined) throw new Error(`봇 ${String(봇번호)} 이 목록에 없다`);
  return 찾은;
}

export async function 보라봇만들기(admin: APIRequestContext, 누구: 캐릭터, 봇값: 봇): Promise<봇> {
  await 순간이동(admin, 누구, 구역자리.Beginner);
  await 본문(
    await admin.post('/combat/pk-attack', {
      headers: 머리(누구),
      data: { attackerKind: 'Bot', attackerId: 봇값.id, targetKind: 'Character', targetId: 누구.번호, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
    }),
    '봇 선공',
  );
  return 봇읽기(admin, 누구, 봇값.id);
}

export async function 빨간봇만들기(admin: APIRequestContext, 누구: 캐릭터, 봇값: 봇): Promise<봇> {
  for (let 번 = 0; 번 < 5; 번 += 1) {
    await 성향주기(admin, 누구, 0);
    await 순간이동(admin, 누구, 구역자리.Beginner);
    await 본문(
      await admin.post('/combat/player-death', {
        headers: 머리(누구),
        data: { killerType: 'Bot', killerId: 봇값.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
      }),
      '봇에게 죽기',
    );
    const 지금 = await 봇읽기(admin, 누구, 봇값.id);
    if (지금.alignment.state === 'Chaotic') return 지금;
  }
  throw new Error(`봇 ${String(봇값.id)} 을 빨간 이름으로 만들지 못했다`);
}

export async function 바닥아이템남기기(
  admin: APIRequestContext,
  앞머리: string,
  자리: { x: number; z: number } = 구역자리.Beginner,
): Promise<{ 떨군: 캐릭터; 아이템: 바닥아이템 }> {
  const 떨군 = await 새캐릭터(admin, 앞머리);
  await 순간이동(admin, 떨군, 자리);
  await 결과고정(admin, { deathDrop: [true] });
  const 죽음 = await 본문<{ dropped: 바닥아이템 | null }>(
    await admin.post('/combat/player-death', { headers: 머리(떨군), data: { killerType: 'Monster', killerId: null, x: 자리.x, z: 자리.z } }),
    '죽음 보고',
  );
  if (죽음.dropped === null) throw new Error('사망 드랍을 고정했는데 바닥 아이템이 생기지 않았다');
  return { 떨군, 아이템: 죽음.dropped };
}
