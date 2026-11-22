import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 안내창 } from '../components/popup.component.js';
import { 알림띠 } from '../components/toast.component.js';
import { 채팅창 } from '../pages/chat.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 로비화면 } from '../pages/lobby.page.js';
import { 봇끄기, 봇켜기 } from './game-state.helper.js';

export type 색 = [number, number, number, number];

function 색으로(값: unknown): 색 | null {
  if (!Array.isArray(값) || 값.length < 3) return null;
  const 수 = 값.map(Number);
  if (수.some((n) => Number.isNaN(n))) return null;
  return [수[0] ?? 0, 수[1] ?? 0, 수[2] ?? 0, 수[3] ?? 1];
}

function 헥스색(헥스: string): 색 {
  const 칸 = (i: number): number => parseInt(헥스.slice(i, i + 2), 16) / 255;
  return [칸(0), 칸(2), 칸(4), 헥스.length >= 8 ? 칸(6) : 1];
}

function 정규식글(글: string): string {
  return 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function 태그색(글: string, 감싼글?: string): 색 | null {
  const 틀 = 감싼글 === undefined ? /<color=#([0-9a-fA-F]{6,8})>/ : new RegExp(`<color=#([0-9a-fA-F]{6,8})>${정규식글(감싼글)}</color>`);
  const 맞음 = 틀.exec(글);
  return 맞음?.[1] === undefined ? null : 헥스색(맞음[1]);
}

export async function 글색(game: GameDriver, 주소: string): Promise<색 | null> {
  const 태그 = 태그색(await game.text(주소));
  if (태그 !== null) return 태그;
  return 색으로(await game.get(주소, 'TextMeshProUGUI.color'));
}

export async function 바탕색(game: GameDriver, 주소: string): Promise<색 | null> {
  return 색으로(await game.get(주소, 'Image.color'));
}

function 색조(c: 색): { 색상: number; 채도: number; 밝기: number } {
  const [r, g, b] = c;
  const 큰 = Math.max(r, g, b);
  const 작 = Math.min(r, g, b);
  const 차 = 큰 - 작;
  let 색상 = 0;
  if (차 > 0) {
    if (큰 === r) 색상 = 60 * (((g - b) / 차 + 6) % 6);
    else if (큰 === g) 색상 = 60 * ((b - r) / 차 + 2);
    else 색상 = 60 * ((r - g) / 차 + 4);
  }
  return { 색상, 채도: 큰 === 0 ? 0 : 차 / 큰, 밝기: 큰 };
}

export function 빨강인가(c: 색 | null): boolean {
  if (c === null) return false;
  const { 색상, 채도, 밝기 } = 색조(c);
  return (색상 <= 15 || 색상 >= 345) && 채도 >= 0.5 && 밝기 >= 0.3;
}

export function 금색인가(c: 색 | null): boolean {
  if (c === null) return false;
  const { 색상, 채도, 밝기 } = 색조(c);
  return 색상 >= 35 && 색상 <= 55 && 채도 >= 0.4 && 밝기 >= 0.8;
}

export function 어두운빨강인가(c: 색 | null): boolean {
  if (c === null) return false;
  const { 색상, 채도, 밝기 } = 색조(c);
  return (색상 <= 15 || 색상 >= 345) && 채도 >= 0.4 && 밝기 < 0.6 && 밝기 >= 0.15;
}

export function 연분홍인가(c: 색 | null): boolean {
  if (c === null) return false;
  const { 색상, 채도, 밝기 } = 색조(c);
  return (색상 <= 20 || 색상 >= 320) && 채도 > 0.05 && 채도 < 0.5 && 밝기 >= 0.8;
}

export function 옅은금색인가(c: 색 | null): boolean {
  if (c === null) return false;
  const { 색상, 채도 } = 색조(c);
  return 색상 >= 30 && 색상 <= 60 && 채도 >= 0.15 && (c[3] <= 0.6 || Math.min(c[0], c[1], c[2]) >= 0.5);
}

export function 회색인가(c: 색 | null): boolean {
  if (c === null) return false;
  const 큰 = Math.max(c[0], c[1], c[2]);
  return 큰 - Math.min(c[0], c[1], c[2]) <= 0.16 && 큰 >= 0.3 && 큰 <= 0.9;
}

export function 검정인가(c: 색 | null): boolean {
  if (c === null) return false;
  return Math.max(c[0], c[1], c[2]) <= 0.15;
}

export function 반투명인가(c: 색 | null): boolean {
  if (c === null) return false;
  return c[3] > 0 && c[3] < 0.95;
}

export interface 자리 {
  x: number;
  y: number;
  가로: number;
  세로: number;
}

export async function 자리읽기(game: GameDriver, 주소: string): Promise<자리 | null> {
  const 찾음 = await game.find(주소);
  if (찾음 === null || 찾음.x === undefined || 찾음.y === undefined || 찾음.screen === undefined) return null;
  return { x: 찾음.x, y: 찾음.y, 가로: 찾음.x / 찾음.screen[0], 세로: 찾음.y / 찾음.screen[1] };
}

export function 오른쪽위인가(a: 자리 | null): boolean {
  return a !== null && a.가로 > 0.5 && a.세로 > 0.5;
}

export function 오른쪽아래인가(a: 자리 | null): boolean {
  return a !== null && a.가로 > 0.5 && a.세로 < 0.5;
}

export function 같은자리인가(a: 자리 | null, b: 자리 | null): boolean {
  return a !== null && b !== null && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;
}

export async function 왼쪽아래인가(game: GameDriver, 주소: string, 기준주소: string): Promise<boolean> {
  const 대상 = await game.find(주소);
  const 기준 = await game.find(기준주소);
  if (대상?.x === undefined || 대상.y === undefined || 기준?.x === undefined || 기준.y === undefined) return false;
  return 대상.x < 기준.x && 대상.y < 기준.y;
}

export async function 안내창버튼글(game: GameDriver): Promise<string> {
  return game.text(`${안내창.주소}/Confirm Button/Text (TMP)`);
}

export async function 안내창버튼이하나인가(game: GameDriver): Promise<boolean> {
  try {
    return (await game.find(`${안내창.주소}//*[@component=Button]`)) !== null;
  } catch (e) {
    if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return false;
    throw e;
  }
}

async function 로그인결과기다리기(game: GameDriver, 한도ms: number): Promise<'안내창' | '로비' | '없음'> {
  const 창 = new 안내창(game);
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if (await 창.보이나()) return '안내창';
    if ((await game.find(로비화면.준비버튼)) !== null) return '로비';
    if (Date.now() > 끝) return '없음';
  }
}

export async function 거절창기다리기(game: GameDriver, 아이디: string, 비밀번호: string, 원하는제목: string, 한도ms = 45_000): Promise<{ 제목: string; 본문: string } | null> {
  const 끝 = Date.now() + 한도ms;
  let 마지막: { 제목: string; 본문: string } | null = null;
  for (;;) {
    const 화면 = await 로그인화면.열림(game);
    if (await 화면.안내.보이나()) await 화면.안내.확인누르기();
    await 화면.넣고시작(아이디, 비밀번호);
    const 결과 = await 로그인결과기다리기(game, 20_000);
    if (결과 === '안내창') {
      마지막 = { 제목: await 화면.안내.제목(), 본문: await 화면.안내.본문() };
      if (마지막.제목 === 원하는제목) return 마지막;
    }
    if (Date.now() > 끝) return 마지막;
    await game.restart();
  }
}

export async function 점검거절기다리기(admin: APIRequestContext, 아이디: string, 비밀번호: string, 한도ms = 45_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    try {
      const 봇 = await 봇켜기(admin, 아이디, 비밀번호);
      await 봇끄기(admin, 봇);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('봇 켜기')) return true;
      throw e;
    }
    if (Date.now() > 끝) return false;
  }
}

export async function 채팅금지알림기다리기(game: GameDriver, 글: string, 한도ms = 45_000): Promise<string | null> {
  const 창 = await 채팅창.열기(game);
  await 창.탭고르기('전체');
  const 알림 = new 알림띠(game);
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    await 창.보내기(글);
    const 주소 = await 알림.그글줄주소('채팅이 금지된 계정입니다', 4_000);
    if (주소 !== null) return game.text(주소);
    if (Date.now() > 끝) return null;
  }
}

export async function 채팅풀릴때까지보내기(game: GameDriver, 글: string, 한도ms = 35_000): Promise<boolean> {
  const 창 = await 채팅창.열기(game);
  await 창.탭고르기('전체');
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    await 창.보내기(글);
    if ((await 창.줄기다리기((줄) => 줄.includes(글), 5, 3_000)) !== null) return true;
    if (Date.now() > 끝) return false;
  }
}
