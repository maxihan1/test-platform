import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 로그인창 } from '../pages/login.page.js';
import {
  임의글자,
  될때까지,
  봇목록,
  봇악명만들기,
  봇처치,
  월드다시두기,
  장비빼고비우기,
  가방,
  플레이어머리,
  산봇들,
  type 계정,
  type 바닥아이템정보,
  type 구역,
  type 봇정보,
  type 봇처치응답,
  type 성향,
  type 캐릭터,
} from './game-state.helper.js';

const 한글처음 = 0xac00;
const 한글수 = 11172;

async function 확인몸<T>(res: APIResponse, 무엇: string): Promise<T> {
  if (!res.ok()) throw new Error(`${무엇} 실패: ${String(res.status())} ${await res.text()}`);
  return JSON.parse(await res.text()) as T;
}

export function 임의한글(길이: number): string {
  let 글 = '';
  for (let i = 0; i < 길이; i += 1) 글 += String.fromCharCode(한글처음 + Math.floor(Math.random() * 한글수));
  return 글;
}

export function 경계아이디(길이: number): string {
  return `zqw${임의글자(Math.max(0, 길이))}`.slice(0, 길이);
}

export async function 캐릭터만들기응답(admin: APIRequestContext, 누구: 계정, 이름: string): Promise<APIResponse> {
  return admin.post('/characters', { headers: 플레이어머리(누구), data: { name: 이름, classType: 'Warrior', gender: 'Male' } });
}

export async function 서버시각(admin: APIRequestContext): Promise<number> {
  const res = await admin.get('/admin/config');
  const 머리 = res.headers()['date'];
  if (머리 === undefined) throw new Error('서버 응답에 Date 머리가 없다');
  return Date.parse(머리);
}

export async function 내캐릭터읽기(admin: APIRequestContext, 누구: 캐릭터): Promise<APIResponse> {
  return admin.get(`/characters/${String(누구.id)}`, { headers: 플레이어머리(누구) });
}

export async function 바닥아이템목록(admin: APIRequestContext, 누구: 계정 | 캐릭터, 곳: 구역): Promise<바닥아이템정보[]> {
  return 확인몸(await admin.get(`/world/ground-items?zone=${곳}`, { headers: 플레이어머리(누구) }), '바닥 아이템 목록 읽기');
}

export async function 봇찾기(admin: APIRequestContext, 누구: 계정 | 캐릭터, 봇번호: number): Promise<봇정보 | undefined> {
  return (await 봇목록(admin, 누구)).find((b) => b.id === 봇번호);
}

export async function 산봇하나(admin: APIRequestContext, 누구: 계정 | 캐릭터, 곳: 구역 = 'Beginner', 상태?: 성향['state']): Promise<봇정보> {
  let 후보 = await 산봇들(admin, 누구, 곳, 상태);
  if (후보.length === 0) {
    await 월드다시두기(admin, 곳);
    후보 = await 산봇들(admin, 누구, 곳, 상태);
  }
  const 봇 = 후보.at(0);
  if (봇 === undefined) throw new Error(`${곳} 에 살아 있는 봇이 없다`);
  return 봇;
}

export async function 악명봇하나(admin: APIRequestContext, 머리: string, 누구: 계정 | 캐릭터, 제외: number[] = []): Promise<봇정보> {
  const 쓸것 = (b: 봇정보): boolean => !제외.includes(b.id);
  const 이미 = (await 산봇들(admin, 누구, 'Beginner', 'Chaotic')).find(쓸것);
  if (이미 !== undefined) return 이미;
  let 선량 = (await 산봇들(admin, 누구, 'Beginner', 'Innocent')).find(쓸것);
  if (선량 === undefined) {
    await 월드다시두기(admin, 'Beginner');
    선량 = (await 산봇들(admin, 누구, 'Beginner', 'Innocent')).find(쓸것);
  }
  if (선량 === undefined) throw new Error('초록 들판에 악명으로 만들 선량한 봇이 없다');
  await 봇악명만들기(admin, 머리, 선량);
  const 다시 = await 봇찾기(admin, 누구, 선량.id);
  if (다시 === undefined || 다시.alignment.state !== 'Chaotic') throw new Error(`봇 ${선량.name} 을 악명으로 만들지 못했다`);
  return 다시;
}

export async function 악명봇처치되풀이(
  admin: APIRequestContext,
  머리: string,
  누구: 캐릭터,
  횟수: number,
): Promise<{ 얻음: number; 못얻음: number }> {
  const 셈 = { 얻음: 0, 못얻음: 0 };
  for (let i = 0; i < 횟수; i += 1) {
    const 봇 = await 악명봇하나(admin, 머리, 누구);
    if ((await 가방(admin, 누구)).used >= 39) await 장비빼고비우기(admin, 누구);
    const res = await 봇처치(admin, 누구, 봇.id);
    if (!res.ok()) throw new Error(`${String(i + 1)}번째 악명 봇 처치 실패: ${String(res.status())} ${await res.text()}`);
    const 몸 = JSON.parse(await res.text()) as 봇처치응답;
    if (몸.dropped === null) 셈.못얻음 += 1;
    else 셈.얻음 += 1;
  }
  return 셈;
}

export async function 봇부활기다리기(admin: APIRequestContext, 누구: 계정 | 캐릭터, 봇번호: number, 한도ms: number): Promise<number | null> {
  const 시작 = Date.now();
  try {
    await 될때까지(
      async () => {
        const 봇 = await 봇찾기(admin, 누구, 봇번호);
        return 봇 !== undefined && !봇.isDead ? true : undefined;
      },
      한도ms,
      1000,
    );
  } catch (오류) {
    if (오류 instanceof Error && 오류.message.includes('안에 기다린 일이')) return null;
    throw 오류;
  }
  return (Date.now() - 시작) / 1000;
}

export function 필드이름들(값: unknown): string[] {
  if (Array.isArray(값)) return 값.flatMap((x) => 필드이름들(x));
  if (typeof 값 !== 'object' || 값 === null) return [];
  return Object.entries(값).flatMap(([키, 안]) => [키, ...필드이름들(안)]);
}

export async function 오류필드(res: APIResponse): Promise<{ code: unknown; message: unknown }> {
  try {
    const 몸 = JSON.parse(await res.text()) as { code?: unknown; message?: unknown };
    return { code: 몸.code, message: 몸.message };
  } catch {
    return { code: undefined, message: undefined };
  }
}

export async function 가입된수(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 목록 = await 확인몸<{ username: string }[]>(
    await admin.get(`/admin/accounts?prefix=${encodeURIComponent(아이디)}&limit=100`),
    `${아이디} 가입 여부 읽기`,
  );
  return 목록.filter((x) => x.username === 아이디).length;
}

export async function 캐릭터수(admin: APIRequestContext, 아이디: string): Promise<number> {
  const 목록 = await 확인몸<{ username: string; characterCount: number }[]>(
    await admin.get(`/admin/accounts?prefix=${encodeURIComponent(아이디)}&limit=100`),
    `${아이디} 캐릭터 수 읽기`,
  );
  return 목록.find((x) => x.username === 아이디)?.characterCount ?? 0;
}

export async function 이름쓰는수(admin: APIRequestContext, 이름: string): Promise<number> {
  const 목록 = await 확인몸<{ name: string }[]>(
    await admin.get(`/admin/characters?name=${encodeURIComponent(이름)}&limit=100`),
    `${이름} 이름 쓰는 캐릭터 읽기`,
  );
  return 목록.filter((x) => x.name === 이름).length;
}

export async function 월드에들어가기(game: GameDriver, 누구: 캐릭터, 입장버튼: string, 월드화면: string): Promise<void> {
  await 로그인창.열기(game);
  await game.type('UsernameInput', 누구.아이디);
  await game.type('PasswordInput', 누구.비밀번호);
  await game.click(로그인창.로그인버튼);
  await game.waitFor(입장버튼);
  await game.click(입장버튼);
  await game.waitFor(월드화면, { timeoutMs: 60_000 });
}

function 자리인가(값: unknown): 값 is { x: number; z: number } {
  if (typeof 값 !== 'object' || 값 === null) return false;
  const 칸 = 값 as { x?: unknown; z?: unknown };
  return typeof 칸.x === 'number' && typeof 칸.z === 'number';
}

export async function 자리읽기(game: GameDriver, 주소: string): Promise<{ x: number; z: number }> {
  const 값 = await game.get(주소, 'Transform.position');
  if (!자리인가(값)) throw new Error(`${주소} 의 Transform.position 을 읽지 못했다`);
  return 값;
}

export async function 거리(game: GameDriver, 가: string, 나: string): Promise<number> {
  const 앞 = await 자리읽기(game, 가);
  const 뒤 = await 자리읽기(game, 나);
  return Math.hypot(앞.x - 뒤.x, 앞.z - 뒤.z);
}

export async function 거리가바뀔때까지(
  game: GameDriver,
  가: string,
  나: string,
  기준: number,
  방향: '멀어짐' | '가까워짐',
  한도ms: number,
): Promise<boolean> {
  try {
    await 될때까지(
      async () => {
        const 지금 = await 거리(game, 가, 나);
        return (방향 === '멀어짐' ? 지금 > 기준 + 1 : 지금 < 기준 - 1) ? true : undefined;
      },
      한도ms,
    );
  } catch (오류) {
    if (오류 instanceof Error && 오류.message.includes('안에 기다린 일이')) return false;
    throw 오류;
  }
  return true;
}

async function 시간안에일어났나(시도: () => Promise<true | undefined>, 한도ms: number): Promise<boolean> {
  try {
    await 될때까지(시도, 한도ms);
  } catch (오류) {
    if (오류 instanceof Error && 오류.message.includes('안에 기다린 일이')) return false;
    throw 오류;
  }
  return true;
}

export async function 마을에간봇이생길때까지(admin: APIRequestContext, 누구: 계정 | 캐릭터, 한도ms: number): Promise<boolean> {
  return 시간안에일어났나(async () => ((await 봇목록(admin, 누구, 'Town')).length > 0 ? true : undefined), 한도ms);
}

export async function 바닥아이템이사라질때까지(admin: APIRequestContext, 누구: 계정 | 캐릭터, 곳: 구역, 바닥번호: number, 한도ms: number): Promise<boolean> {
  return 시간안에일어났나(async () => ((await 바닥아이템목록(admin, 누구, 곳)).some((x) => x.id === 바닥번호) ? undefined : true), 한도ms);
}
