import type { GameDriver } from '@platform/kit';

import { 오른쪽위버튼 } from '../components/corner.component.js';

const 가운데허용 = 0.1;

async function 중심(game: GameDriver, 주소: string): Promise<{ 가로: number; 세로: number }> {
  const 찾음 = await game.find(주소);
  if (찾음 === null) throw new Error(`${주소} 를 찾지 못했다`);
  if (찾음.rect === undefined || 찾음.screen === undefined) throw new Error(`${주소} 의 화면 자리(rect · screen)를 읽지 못했다`);
  const [x, y, 너비, 높이] = 찾음.rect;
  const [화면너비, 화면높이] = 찾음.screen;
  return { 가로: (x + 너비 / 2) / 화면너비, 세로: (y + 높이 / 2) / 화면높이 };
}

export async function 가운데에있는지(game: GameDriver, 주소: string): Promise<boolean> {
  const 자리 = await 중심(game, 주소);
  return Math.abs(자리.가로 - 0.5) <= 가운데허용 && Math.abs(자리.세로 - 0.5) <= 가운데허용;
}

export async function 오른쪽아래에있는지(game: GameDriver, 주소: string): Promise<boolean> {
  const 자리 = await 중심(game, 주소);
  return 자리.가로 > 0.5 && 자리.세로 < 0.5;
}

export async function 오른쪽위에있는지(game: GameDriver, 주소: string): Promise<boolean> {
  const 자리 = await 중심(game, 주소);
  return 자리.가로 > 0.5 && 자리.세로 > 0.5;
}

export async function 설정창닫기(game: GameDriver): Promise<void> {
  if ((await game.find(오른쪽위버튼.설정창)) === null) return;
  await game.click(오른쪽위버튼.톱니바퀴);
  await game.waitFor(오른쪽위버튼.설정창, { gone: true, timeoutMs: 10_000 });
}

export async function 나가기창닫기(game: GameDriver): Promise<void> {
  if ((await game.find(오른쪽위버튼.나가기창)) === null) return;
  await game.click(오른쪽위버튼.나가기취소);
  await game.waitFor(오른쪽위버튼.나가기창, { gone: true, timeoutMs: 10_000 });
}
