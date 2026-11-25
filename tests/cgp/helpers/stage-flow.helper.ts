import type { GameDriver } from '@platform/kit';

import { 스테이지화면 } from '../pages/stage.page.js';
import { 스테이지까지 } from './enter.helper.js';

export async function 살아있는스테이지(game: GameDriver): Promise<스테이지화면> {
  const 끝남 = await game.get(스테이지화면.세계수, 'Lumikantle.IsGameOver').then(
    (값) => 값 === true,
    () => true,
  );
  if (끝남) return await 스테이지까지(game);
  return await 스테이지화면.기다리기(game);
}

export async function 첫식물주소(스테이지: 스테이지화면): Promise<string> {
  const 식물 = (await 스테이지.식물들())[0];
  if (식물 === undefined) throw new Error('스테이지에 심긴 식물을 찾지 못했다');
  return 식물;
}

export async function 식물이있는판(game: GameDriver): Promise<{ 스테이지: 스테이지화면; 식물: string }> {
  const 스테이지 = await 살아있는스테이지(game);
  if ((await 스테이지.식물수()) === 0) {
    await 스테이지.여기심기();
    await 스테이지.식물수될때까지(1, 3_000);
  }
  return { 스테이지, 식물: await 첫식물주소(스테이지) };
}

export async function 체력오를때까지(스테이지: 스테이지화면, 식물: string, 앞: number, 한도ms: number): Promise<number> {
  const 끝 = Date.now() + 한도ms;
  let 뒤 = await 스테이지.식물체력(식물);
  while (뒤 <= 앞 && Date.now() < 끝) 뒤 = await 스테이지.식물체력(식물);
  return 뒤;
}

export function 지점마다길이하나(지점들: string[], 길들: string[]): boolean {
  const 길모음 = new Map<string, Set<string>>();
  지점들.forEach((지점, 순번) => {
    const 모음 = 길모음.get(지점) ?? new Set<string>();
    모음.add(길들[순번] ?? '');
    길모음.set(지점, 모음);
  });
  return 길모음.size > 0 && [...길모음.values()].every((모음) => 모음.size === 1);
}

export async function 빨간글인가(game: GameDriver, 주소: string, 칸: string): Promise<boolean> {
  const 값 = await game.get(주소, 칸);
  const 색 = Array.isArray(값) ? (값 as number[]) : [Number((값 as { r?: number }).r), Number((값 as { g?: number }).g), Number((값 as { b?: number }).b)];
  const [r, g, b] = 색;
  return r > 0.2 && r > 2 * Math.max(g, b);
}
