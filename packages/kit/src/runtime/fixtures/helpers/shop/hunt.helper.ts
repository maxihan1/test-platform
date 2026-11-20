// gameFns.test.ts 가 쓰는 가짜 도우미 — 하위 폴더의 도우미도 스택에서 읽히는지 본다

import { 던전화면 } from '../../pages/dungeon.page.js';

interface 누르는것 {
  click(target: string): Promise<unknown>;
}

export async function 사냥한번(game: 누르는것): Promise<void> {
  await new 던전화면(game).공격();
}

export const gm = {
  async GM골드(game: 누르는것): Promise<void> {
    await game.click('/Chat/Send');
  },
};
