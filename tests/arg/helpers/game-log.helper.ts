import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 던전화면 } from '../pages/dungeon.page.js';

export interface 사람칸 {
  user: string;
  level: number;
  job: string;
  weapon: string;
  armor: string;
  accessory: string;
}

export type 누구칸 = 사람칸 | { npc: string };

export interface 체력줄 {
  seq: number;
  kind: 'hit' | 'heal';
  players: number;
  from: 누구칸;
  to: 누구칸;
  skill: string;
  value: number;
  hpBefore: number;
}

export interface 처치로그 {
  seq: number;
  kind: 'kill';
  players: number;
  by: 누구칸;
  npc: string;
  gold: number;
  exp: number;
  party: number;
}

export interface 그밖줄 {
  seq: number;
  kind: 'item' | 'levelup';
  players: number;
  by: 누구칸;
}

export type 로그줄 = 체력줄 | 처치로그 | 그밖줄;

export interface 시작조건 {
  level: number;
  job: string;
  weapon?: string;
  armor?: string;
  accessory?: string;
  players: number;
}

export async function 로그읽기(admin: APIRequestContext, 아이디: string, since: number | null): Promise<{ last: number; lines: 로그줄[] }> {
  const res = await admin.get(`/test/log?since=${String(since ?? 999_999_999)}`);
  if (!res.ok()) throw new Error(`게임 로그 읽기 실패: ${String(res.status())} ${await res.text()}`);
  const 몸 = (await res.json()) as { ok?: boolean; last: number; lines: 로그줄[] };
  if (몸.ok === false) throw new Error(`게임 로그 읽기 실패: ${JSON.stringify(몸)}`);
  if (since === null) return { last: 몸.last, lines: [] };
  const 첫번호 = 몸.lines[0]?.seq ?? (몸.last > since ? Number.NaN : undefined);
  if (첫번호 !== undefined && 첫번호 !== since + 1) throw new Error(`게임 로그 줄이 빠졌습니다 (since ${String(since)} · 첫 줄 ${String(첫번호)})`);
  return { last: 몸.last, lines: 몸.lines.filter((줄) => 사람들(줄).some((사람) => 사람.user === 아이디)) };
}

function 사람인가(누구: 누구칸): 누구 is 사람칸 {
  return 'user' in 누구;
}

function 사람들(줄: 로그줄): 사람칸[] {
  const 칸들 = 'from' in 줄 ? [줄.from, 줄.to] : [줄.by];
  return 칸들.filter(사람인가);
}

function 조건맞나(누구: 누구칸, 아이디: string, 조건: 시작조건, players: number): 누구 is 사람칸 {
  return (
    사람인가(누구) &&
    누구.user === 아이디 &&
    누구.level === 조건.level &&
    누구.job === 조건.job &&
    누구.weapon === (조건.weapon ?? '-') &&
    누구.armor === (조건.armor ?? '-') &&
    누구.accessory === (조건.accessory ?? '-') &&
    players === 조건.players
  );
}

function 임프인가(누구: 누구칸): boolean {
  return !사람인가(누구) && 누구.npc === 'Imp';
}

export function 받은피해(줄들: 로그줄[], 아이디: string, 조건: 시작조건): 체력줄[] {
  return 줄들.filter((줄): 줄 is 체력줄 => 줄.kind === 'hit' && 임프인가(줄.from) && 조건맞나(줄.to, 아이디, 조건, 줄.players));
}

export function 준피해(줄들: 로그줄[], 아이디: string, 조건: 시작조건, 스킬: string): 체력줄[] {
  return 줄들.filter(
    (줄): 줄 is 체력줄 => 줄.kind === 'hit' && 임프인가(줄.to) && 줄.skill === 스킬 && 조건맞나(줄.from, 아이디, 조건, 줄.players),
  );
}

export function 처치줄(줄들: 로그줄[], 아이디: string, 조건: 시작조건): 처치로그[] {
  return 줄들.filter((줄): 줄 is 처치로그 => 줄.kind === 'kill' && 줄.npc === 'Imp' && 조건맞나(줄.by, 아이디, 조건, 줄.players));
}

export function 설명안되는줄(줄들: 로그줄[], 설명된줄: 로그줄[]): string[] {
  const 설명됨 = new Set(설명된줄.map((줄) => 줄.seq));
  return 줄들.filter((줄) => !설명됨.has(줄.seq)).map((줄) => JSON.stringify(줄));
}

export async function 임프에게맞기(game: GameDriver): Promise<void> {
  await game.waitFor(던전화면.내피해숫자, { timeoutMs: 5_000 }).catch(() => undefined);
  await game.waitFor(던전화면.내피해숫자, { gone: true, timeoutMs: 5_000 }).catch(() => undefined);
}

export async function 임프치기(game: GameDriver): Promise<void> {
  const 화면 = 던전화면.지금(game);
  if ((await game.find(던전화면.임프)) === null) {
    await game.waitFor(던전화면.임프, { timeoutMs: 5_000 }).catch(() => undefined);
    return;
  }
  await 화면.누르기(던전화면.임프);
  await 화면.누르기(던전화면.공격);
  await game.waitFor(던전화면.적피해숫자, { timeoutMs: 5_000 }).catch(() => undefined);
}
