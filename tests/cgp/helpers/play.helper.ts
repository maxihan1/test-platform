import type { GameDriver } from '@platform/kit';

import { 걸어가기, 고기수, 심긴식물주소들, 심기 } from './stage.helper.js';

export const 막을자리: [number, number][] = [
  [24.9, 27.1], [34, 34.6], [17.5, 27.1], [7.8, 31.5], [28.7, 35.5], [12.6, 35.9],
  [30.5, 31.5], [12, 35.5], [33, 29], [8.5, 27], [21.5, 28.5], [30, 25.5], [11, 25.5], [5.5, 36],
];

const 세계수 = '/Lumikantle';
const 떨어진고기 = '/PooledObjectsRoot/MeatDrop/MeatDrop(Clone)[0]';

export async function 판끝났나(game: GameDriver): Promise<boolean> {
  return (await game.get(세계수, 'Lumikantle.IsGameOver').catch(() => true)) === true;
}

export async function 세계수체력(game: GameDriver): Promise<number> {
  return Number(await game.get(세계수, 'Lumikantle.LumikantleHP.Value'));
}

export async function 웨이브번호(game: GameDriver): Promise<number> {
  const 글 = (await game.text('/BossRoomHudCanvas/WaveRoot/Wave/WaveBg/txt/WaveText')).replace(/<[^>]+>/g, '');
  return Number(글.split('/')[0]);
}

export async function 막기조각(game: GameDriver, 초: number, 자리들: [number, number][] = 막을자리): Promise<void> {
  const 끝 = Date.now() + 초 * 1000;
  while (Date.now() < 끝) {
    if (await 판끝났나(game)) return;
    const 심은수 = (await 심긴식물주소들(game)).length;
    if ((await 고기수(game)) >= 5 && 심은수 < 자리들.length) {
      await 심기(game, [자리들[심은수]]);
      continue;
    }
    const 고기자리 = (await game.get(떨어진고기, 'Transform.position').catch(() => null)) as number[] | null;
    if (고기자리 !== null && 고기자리[2] > 23.5 && 고기자리[2] < 42.5) await 걸어가기(game, [고기자리[0], 고기자리[2]], 3);
    for (let i = 0; i < 3; i += 1) await game.key('Z');
  }
}

export async function 버티기조각(game: GameDriver, 초: number, 체력들: number[]): Promise<void> {
  const 끝 = Date.now() + 초 * 1000;
  while (Date.now() < 끝 && !(await 판끝났나(game))) 체력들.push(await 세계수체력(game));
  if (await 판끝났나(game)) 체력들.push(await 세계수체력(game));
}
