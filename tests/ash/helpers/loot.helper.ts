import type { APIRequestContext } from '@playwright/test';

import type { 월드화면 } from '../pages/world.page.js';
import { 머리, 본문, type 봇, type 캐릭터 } from './api.helper.js';
import { 구역자리, 드랍확률바꾸기, 봇목록, 새캐릭터, 설정읽기, 순간이동, 아이템주기, 월드초기화, 캐릭터바꾸기, 캐릭터지우기 } from './game-state.helper.js';
import { 봇처치, 봇처치결과, 죽음보고 } from './pk.helper.js';



async function 확률단위(admin: APIRequestContext): Promise<number> {
  const 드랍 = (await 설정읽기(admin)).drop;
  const 값들 = [드랍.botLootChance, 드랍.botLootChanceChaotic, ...드랍.deathDrop.map((c) => c.chance)];
  return 값들.some((v) => v > 1) ? 100 : 1;
}

async function 구간찾기(admin: APIRequestContext, 성향값: number): Promise<{ 칸들: { maxAlignment: number; chance: number; includeEquipped: boolean }[]; 번: number }> {
  const 칸들 = [...(await 설정읽기(admin)).drop.deathDrop].sort((a, b) => a.maxAlignment - b.maxAlignment);
  const 번 = 칸들.findIndex((c) => 성향값 <= c.maxAlignment);
  if (번 < 0) throw new Error(`성향치 ${String(성향값)} 이 들어가는 사망 드랍 구간이 없다`);
  return { 칸들, 번 };
}

export async function 구간확률바꾸기(admin: APIRequestContext, 성향값: number, 비율: number): Promise<void> {
  const 단위 = await 확률단위(admin);
  const { 칸들, 번 } = await 구간찾기(admin, 성향값);
  await 드랍확률바꾸기(admin, { deathDrop: 칸들.map((c, i) => (i === 번 ? { ...c, chance: 비율 * 단위 } : c)) });
}

export async function 구간확률읽기(admin: APIRequestContext, 성향값: number): Promise<number> {
  const 단위 = await 확률단위(admin);
  const { 칸들, 번 } = await 구간찾기(admin, 성향값);
  return (칸들[번]?.chance ?? Number.NaN) / 단위;
}

export async function 봇전리품확률바꾸기(admin: APIRequestContext, 악명: boolean, 비율: number): Promise<void> {
  const 단위 = await 확률단위(admin);
  await 드랍확률바꾸기(admin, 악명 ? { botLootChanceChaotic: 비율 * 단위 } : { botLootChance: 비율 * 단위 });
}

export async function 봇전리품확률읽기(admin: APIRequestContext, 악명: boolean): Promise<number> {
  const 단위 = await 확률단위(admin);
  const 드랍 = (await 설정읽기(admin)).drop;
  return (악명 ? 드랍.botLootChanceChaotic : 드랍.botLootChance) / 단위;
}

export async function 일꾼들만들기(admin: APIRequestContext, 앞머리: string, 수: number, 성향값: number, 담을곳: 캐릭터[]): Promise<void> {
  await Promise.all(
    Array.from({ length: 수 }, async () => {
      const 누구 = await 새캐릭터(admin, 앞머리);
      담을곳.push(누구);
      await 캐릭터바꾸기(admin, 누구, { alignment: 성향값, clearPurple: true, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z });
    }),
  );
}

export async function 모두지우기(admin: APIRequestContext, 목록: 캐릭터[]): Promise<void> {
  await Promise.all(목록.map((누구) => 캐릭터지우기(admin, 누구)));
}

export async function 죽어서떨군수(요청: APIRequestContext, admin: APIRequestContext, 누구: 캐릭터, 횟수: number): Promise<number> {
  let 떨군수 = 0;
  for (let 번 = 0; 번 < 횟수; 번 += 1) {
    const 죽음 = await 죽음보고(요청, 누구);
    if ((죽음.dropped ?? null) !== null) {
      떨군수 += 1;
      await 아이템주기(admin, 누구, 'potion_hp_s');
    }
  }
  return 떨군수;
}

export async function 일꾼들죽어서떨군수(요청: APIRequestContext, admin: APIRequestContext, 일꾼들: 캐릭터[], 시도: number): Promise<number> {
  const 수들 = await Promise.all(
    일꾼들.map((누구, 번) => 죽어서떨군수(요청, admin, 누구, Math.floor(시도 / 일꾼들.length) + (번 < 시도 % 일꾼들.length ? 1 : 0))),
  );
  return 수들.reduce((합, n) => 합 + n, 0);
}

const 필드먼저 = (a: 봇, b: 봇): number => Number(a.zone !== 'Beginner') - Number(b.zone !== 'Beginner');

export async function 새로시드한선량봇들(admin: APIRequestContext, 관찰자: { 토큰: string }, 수?: number): Promise<봇[]> {
  await 월드초기화(admin);
  const 봇들 = (await 봇목록(admin, 관찰자)).filter((b) => !b.isDead && b.alignment.state === 'Innocent').sort(필드먼저);
  if (수 !== undefined && 봇들.length < 수) throw new Error(`새로 시드한 뒤에도 살아 있는 선량한 봇이 ${String(봇들.length)}명뿐이다(필요 ${String(수)}명)`);
  return 수 === undefined ? 봇들 : 봇들.slice(0, 수);
}

async function 빨갛게(요청: APIRequestContext, admin: APIRequestContext, 피해: 캐릭터, 봇값: 봇): Promise<void> {
  await 캐릭터바꾸기(admin, 피해, { alignment: 0, clearPurple: true, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z });
  await 본문(
    await 요청.post('/combat/player-death', {
      headers: 머리(피해),
      data: { killerType: 'Bot', killerId: 봇값.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
    }),
    '봇에게 죽기',
  );
}

export async function 빨간봇으로만들기(요청: APIRequestContext, admin: APIRequestContext, 일꾼들: 캐릭터[], 봇들: 봇[]): Promise<봇[]> {
  const 다된 = new Map<number, 봇>();
  let 남은 = 봇들;
  for (let 번 = 0; 번 < 3 && 남은.length > 0; 번 += 1) {
    await Promise.all(남은.map((b, i) => 빨갛게(요청, admin, 일꾼들[i % 일꾼들.length]!, b)));
    const 지금 = new Map((await 봇목록(admin, 일꾼들[0]!)).map((b) => [b.id, b] as const));
    for (const b of 남은) {
      const 현재 = 지금.get(b.id);
      if (현재 !== undefined && !현재.isDead && 현재.alignment.state === 'Chaotic') 다된.set(b.id, 현재);
    }
    남은 = 봇들.filter((b) => !다된.has(b.id));
  }
  if (남은.length > 0) throw new Error(`빨간 이름으로 만들지 못한 봇이 ${String(남은.length)}명 남았다`);
  return 봇들.map((b) => 다된.get(b.id)!);
}

export async function 봇들을처치한결과(요청: APIRequestContext, 누구: 캐릭터, 봇들: 봇[]): Promise<봇처치결과[]> {
  const 결과들: 봇처치결과[] = [];
  for (const b of 봇들) 결과들.push(await 본문<봇처치결과>(await 봇처치(요청, 누구, b), '봇 처치'));
  return 결과들;
}

export function 전리품수(결과들: 봇처치결과[]): number {
  return 결과들.filter((r) => (r.dropped ?? null) !== null).length;
}

export function 장비전리품수(봇들: 봇[], 결과들: 봇처치결과[]): number {
  return 결과들.filter((r, i) => r.dropped != null && (봇들[i]?.equipment ?? []).some((e) => e.id === r.dropped?.id)).length;
}

export interface 처치들 {
  봇들: 봇[];
  결과들: 봇처치결과[];
}

async function 나눠서처치(요청: APIRequestContext, 일꾼들: 캐릭터[], 봇들: 봇[], 앞일?: (누구: 캐릭터) => Promise<unknown>): Promise<봇처치결과[]> {
  const 결과들: 봇처치결과[] = new Array<봇처치결과>(봇들.length);
  await Promise.all(
    일꾼들.map(async (누구, 몫) => {
      for (let 번 = 몫; 번 < 봇들.length; 번 += 일꾼들.length) {
        if (앞일 !== undefined) await 앞일(누구);
        결과들[번] = await 본문<봇처치결과>(await 봇처치(요청, 누구, 봇들[번]!), '봇 처치');
      }
    }),
  );
  return 결과들;
}

export async function 선량봇처치들(요청: APIRequestContext, admin: APIRequestContext, 일꾼들: 캐릭터[], 시도: number): Promise<처치들> {
  const 봇모음: 봇[] = [];
  const 결과모음: 봇처치결과[] = [];
  let 남음 = 시도;
  while (남음 > 0) {
    const 이번 = (await 새로시드한선량봇들(admin, 일꾼들[0]!)).slice(0, 남음);
    if (이번.length === 0) throw new Error('새로 시드해도 살아 있는 선량한 봇이 없다');
    결과모음.push(...(await 나눠서처치(요청, 일꾼들, 이번)));
    봇모음.push(...이번);
    남음 -= 이번.length;
  }
  return { 봇들: 봇모음, 결과들: 결과모음 };
}

export async function 빨간봇처치들(요청: APIRequestContext, admin: APIRequestContext, 일꾼들: 캐릭터[], 시도: number): Promise<처치들> {
  const 봇모음: 봇[] = [];
  const 결과모음: 봇처치결과[] = [];
  let 남음 = 시도;
  while (남음 > 0) {
    const 이번 = (await 새로시드한선량봇들(admin, 일꾼들[0]!)).slice(0, 남음);
    if (이번.length === 0) throw new Error('새로 시드해도 살아 있는 선량한 봇이 없다');
    const 빨강 = await 빨간봇으로만들기(요청, admin, 일꾼들, 이번);
    결과모음.push(...(await 나눠서처치(요청, 일꾼들, 빨강, (누구) => 순간이동(admin, 누구, 'Beginner'))));
    봇모음.push(...빨강);
    남음 -= 빨강.length;
  }
  return { 봇들: 봇모음, 결과들: 결과모음 };
}

export async function HP가줄때까지(월드: 월드화면, 한도ms: number): Promise<{ 현재: number; 최대: number }> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 글 = await 월드.HP글();
    const 찾음 = /HP\s*(\d+)\s*\/\s*(\d+)/.exec(글);
    if (찾음 !== null) {
      const 현재 = Number(찾음[1]);
      const 최대 = Number(찾음[2]);
      if (현재 < 최대 || Date.now() >= 끝) return { 현재, 최대 };
    } else if (Date.now() >= 끝) {
      throw new Error(`HP 글을 읽지 못했다: ${글}`);
    }
    await new Promise<void>((풀림) => setTimeout(풀림, 1000));
  }
}
