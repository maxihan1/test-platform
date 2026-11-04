import type { APIRequestContext } from '@playwright/test';

import { 봇처치, 살아있는봇들, 봇좌표, 떨어뜨릴때까지죽기 } from './combat.helper.js';
import {
  GM설정,
  GM성향,
  가방읽기,
  값읽기,
  장비다해제,
  팔기,
  플레이어만들기,
  템플릿찾기,
  type 가방,
  type 바닥아이템,
  type 아이템,
  type 봇,
  type 캐릭터,
  type 플레이어,
} from './game.helper.js';

export interface 사망드랍구간 {
  maxAlignment: number;
  chance: number;
  includeEquipped: boolean;
}

export interface 봇처치응답 {
  dropped?: 아이템 | null;
  droppedToGround?: boolean;
  groundItemId?: number | null;
  alignmentDelta: number;
  character: 캐릭터;
  bot: 봇;
}

export async function 사망드랍구간읽기(request: APIRequestContext, 나: 플레이어, 최대성향?: number): Promise<사망드랍구간 | undefined> {
  const 설정 = await 값읽기<{ drop?: { deathDrop?: 사망드랍구간[] | null } }>(await GM설정(request, 나));
  const 구간들 = 설정.drop?.deathDrop ?? [];
  if (최대성향 !== undefined) return 구간들.find((구간) => 구간.maxAlignment === 최대성향);
  return [...구간들].sort((a, b) => b.maxAlignment - a.maxAlignment)[0];
}

export async function 시작물약팔기(request: APIRequestContext, 나: 플레이어): Promise<void> {
  const 물약 = 템플릿찾기(await 가방읽기(request, 나), 'potion_hp_s');
  if (물약 !== undefined) await 팔기(request, 나, 물약.id, 물약.quantity);
}

export async function 물약묶음만남기기(request: APIRequestContext, 나: 플레이어): Promise<void> {
  await 장비다해제(request, 나);
  const 지금 = await 가방읽기(request, 나);
  for (const 것 of 지금.items.filter((i) => i.templateId !== 'potion_hp_s')) await 팔기(request, 나, 것.id, 것.quantity);
}

export async function 떨어진아이템만들기(request: APIRequestContext, 물약빼기 = false): Promise<{ 떨군이: 플레이어; 바닥: 바닥아이템 | undefined }> {
  const 떨군이 = await 플레이어만들기(request);
  if (물약빼기) await 시작물약팔기(request, 떨군이);
  await GM성향(request, 떨군이, -650);
  const 결과 = await 떨어뜨릴때까지죽기(request, 떨군이);
  return { 떨군이, 바닥: 결과.응답본문?.dropped ?? undefined };
}

export function 템플릿수량(지금: 가방, 템플릿: string): number {
  return 지금.items.filter((i) => i.templateId === 템플릿).reduce((합, i) => 합 + i.quantity, 0);
}

export function 초뒤인가(시각글자: string | null | undefined, 기준시각: number, 초: number, 오차초: number): boolean {
  if (시각글자 === null || 시각글자 === undefined) return false;
  const 차이초 = (Date.parse(시각글자) - 기준시각) / 1000;
  return Math.abs(차이초 - 초) <= 오차초;
}

export function 전리품이나왔나(값: 봇처치응답 | undefined): boolean {
  if (값 === undefined) return false;
  return (값.dropped !== null && 값.dropped !== undefined) || 값.droppedToGround === true;
}

export async function 전리품나올때까지처치(
  request: APIRequestContext,
  나: 플레이어,
  조건: (b: 봇) => boolean,
  상한: number,
): Promise<{ 응답본문: 봇처치응답 | undefined; 처치수: number }> {
  const 쓴봇 = new Set<number>();
  let 처치수 = 0;
  for (let 바퀴 = 0; 바퀴 < 상한 * 3 && 처치수 < 상한; 바퀴 += 1) {
    const 후보 = (await 살아있는봇들(request, 나, 조건)).filter((b) => !쓴봇.has(b.id));
    for (const 대상 of 후보) {
      if (처치수 >= 상한) break;
      쓴봇.add(대상.id);
      const 응답 = await 봇처치(request, 나, 대상.id, 봇좌표(대상));
      if (응답.status() !== 200) continue;
      처치수 += 1;
      const 값 = await 값읽기<봇처치응답>(응답);
      if (전리품이나왔나(값)) return { 응답본문: 값, 처치수 };
    }
  }
  return { 응답본문: undefined, 처치수 };
}

export async function 봇들처치해보기(
  request: APIRequestContext,
  나: 플레이어,
  후보: 봇[],
): Promise<{ 응답본문: 봇처치응답 | undefined; 알린시각: number }> {
  for (const 대상 of 후보.slice(0, 5)) {
    const 알린시각 = Date.now();
    const 응답 = await 봇처치(request, 나, 대상.id, 봇좌표(대상));
    if (응답.status() === 200) return { 응답본문: await 값읽기<봇처치응답>(응답), 알린시각 };
  }
  return { 응답본문: undefined, 알린시각: Date.now() };
}
