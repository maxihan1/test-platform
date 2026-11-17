import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import type { AppDriver } from '@platform/kit/app';

import { 공통HUD } from '../components/hud.component.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 접속자, 봇켜기 } from './game-state.helper.js';

const 게임꾸러미 = 'com.maxihan.bossroom';

export const 레벨업글 = '//*[@text=레벨 업!]';
export const 알림바탕 = '/Showcase HUD/Toasts/Toast';

export async function 게임다시켜기(driver: AppDriver, game: GameDriver): Promise<로그인화면> {
  await driver.terminateApp(게임꾸러미);
  await driver.activateApp(게임꾸러미);
  await game.waitForValue(로그인화면.게임시작, 'Button.interactable', true, { timeoutMs: 120_000 });
  return await 로그인화면.열기(game);
}

export async function 접속자에서빠질때까지(admin: APIRequestContext, 아이디: string, 시간 = 30_000): Promise<boolean> {
  const 끝 = Date.now() + 시간;
  do {
    const 지금 = await 접속자(admin);
    if (!지금.players.some((p) => p.user === 아이디)) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 손님봇켜기(admin: APIRequestContext, 몇명: number, 처음 = 1): Promise<string[]> {
  const 이름들: string[] = [];
  for (let 번호 = 처음; 번호 < 처음 + 몇명; 번호 += 1) 이름들.push(await 봇켜기(admin, { bot: `qa-guest-${String(번호)}` }));
  return 이름들;
}

export interface 자리비율 {
  가로: number;
  위에서: number;
}

export async function 자리읽기(game: GameDriver, 주소: string): Promise<자리비율 | null> {
  const 찾은것 = await game.find(주소);
  if (찾은것 === null || 찾은것.x === undefined || 찾은것.y === undefined || 찾은것.screen === undefined) return null;
  return { 가로: 찾은것.x / 찾은것.screen[0], 위에서: 1 - 찾은것.y / 찾은것.screen[1] };
}

export async function 자리가맞나(game: GameDriver, 주소: string, 가로: '왼쪽' | '가운데' | '오른쪽' | '아무', 세로: '위' | '가운데' | '아래'): Promise<boolean> {
  const 자리 = await 자리읽기(game, 주소);
  if (자리 === null) return false;
  const 가로맞음 = 가로 === '아무' ? true : 가로 === '왼쪽' ? 자리.가로 < 0.4 : 가로 === '오른쪽' ? 자리.가로 > 0.6 : 자리.가로 >= 0.3 && 자리.가로 <= 0.7;
  const 세로맞음 = 세로 === '위' ? 자리.위에서 < 0.4 : 세로 === '아래' ? 자리.위에서 > 0.6 : 자리.위에서 >= 0.3 && 자리.위에서 <= 0.7;
  return 가로맞음 && 세로맞음;
}

export async function 글색읽기(game: GameDriver, 주소: string): Promise<number[]> {
  return (await game.get(주소, 'TextMeshProUGUI.color')) as number[];
}

export async function 바탕색읽기(game: GameDriver, 주소: string): Promise<number[]> {
  return (await game.get(주소, 'Image.color')) as number[];
}

export function 빨강인가(색: number[]): boolean {
  const [r = 0, g = 0, b = 0] = 색;
  return r >= 0.6 && g <= 0.45 && b <= 0.45;
}

export function 회색인가(색: number[]): boolean {
  const [r = 0, g = 0, b = 0] = 색;
  return r >= 0.3 && r <= 0.85 && Math.abs(r - g) <= 0.12 && Math.abs(g - b) <= 0.12;
}

export function 금색인가(색: number[]): boolean {
  const [r = 0, g = 0, b = 0] = 색;
  return r >= 0.8 && g >= 0.6 && g <= 0.95 && b <= 0.5;
}

export function 어두운빨강인가(색: number[]): boolean {
  const [r = 0, g = 0, b = 0] = 색;
  return r >= 0.25 && r <= 0.7 && r - g >= 0.2 && r - b >= 0.2;
}

export function 연분홍인가(색: number[]): boolean {
  const [r = 0, g = 0, b = 0] = 색;
  return r >= 0.8 && g >= 0.5 && b >= 0.5 && r - g >= 0.1;
}

export function 원문금색인가(원문: string, 글: string): boolean {
  const 맞은것 = new RegExp(`<color=#([0-9A-Fa-f]{6})[0-9A-Fa-f]{0,2}>\\s*${글.replace(/[[\]]/g, '\\$&')}`).exec(원문);
  if (맞은것 === null) return false;
  const 값 = parseInt(맞은것[1] ?? '000000', 16);
  return 금색인가([((값 >> 16) & 255) / 255, ((값 >> 8) & 255) / 255, (값 & 255) / 255]);
}

export async function 알림최대개수(game: GameDriver, 시간 = 1_500): Promise<number> {
  const 화면 = new 공통HUD(game);
  let 최대 = 0;
  const 끝 = Date.now() + 시간;
  do {
    최대 = Math.max(최대, (await 화면.알림글들()).length);
  } while (Date.now() < 끝);
  return 최대;
}

export async function 알림이없어질때까지(game: GameDriver, 시간 = 15_000): Promise<boolean> {
  const 화면 = new 공통HUD(game);
  const 끝 = Date.now() + 시간;
  do {
    if ((await 화면.알림글들()).length === 0) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 글이뜰때까지(game: GameDriver, 글: string, 시간 = 10_000): Promise<boolean> {
  return game.waitFor(`//*[contains(@text,${글})]`, { timeoutMs: 시간 }).then(
    () => true,
    () => false,
  );
}
