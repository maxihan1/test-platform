import type { GameDriver } from '@platform/kit';
import { 걸어가기, 고기수, 다시스테이지로, 위치, 줍고심기 } from './stage.helper.js';

async function 읽기(game: GameDriver, 주소: string): Promise<string> {
  return (await game.text(주소).catch(() => '?')).replace(/<[^>]+>/g, '');
}

async function 고기바뀜(game: GameDriver, 앞: number, 한도ms: number): Promise<number> {
  const 끝 = Date.now() + 한도ms;
  let 뒤 = 앞;
  while (뒤 === 앞 && Date.now() < 끝) 뒤 = await 고기수(game);
  return 뒤;
}

export async function 시험판(game: GameDriver, 버틸초 = 320): Promise<{ 잰것: string[]; 이김: boolean; 판: string[]; 끝: string }> {
  const 잰것: string[] = [];
  const 들어감 = await 다시스테이지로(game);
  잰것.push(`들어감 ${들어감.들어감} 웨이브 ${await 읽기(game, '//*[@name=WaveText]')} 남은 ${await 읽기(game, '//*[@name=LeftMonsterText]')} 고기 ${await 고기수(game)}`);
  if (!들어감.들어감) return { 잰것, 이김: false, 판: [], 끝: '' };

  const 앞자리 = await 위치(game);
  await game.key('RightArrow', { duration: 1 });
  const 뒤자리 = await 위치(game);
  잰것.push(`→1초 ${앞자리.join(',')}→${뒤자리.join(',')} dx ${Math.round((뒤자리[0] - 앞자리[0]) * 100) / 100}`);

  const F앞 = await 고기수(game);
  await game.key('F');
  잰것.push(`빈자리 F 고기 ${F앞}→${await 고기바뀜(game, F앞, 3_000)}`);

  const 심음: string[] = [];
  for (const 자리 of [[24.9, 27.1], [34, 34.6]] as [number, number][]) {
    const 감 = await 걸어가기(game, 자리);
    const 앞 = await 고기수(game);
    await game.key('X', { duration: 0.6 });
    await game.key('X');
    const 뒤 = await 고기바뀜(game, 앞, 2_000);
    const 줄 = `0.6초 X·X ${감.자리.join(',')} ${감.닿음 ? '' : '못닿음 '}고기 ${앞}→${뒤}`;
    잰것.push(줄);
    심음.push(줄);
  }
  잰것.push(`두 그루 뒤 고기 ${await 고기수(game)}`);

  const 뒤 = await 줍고심기(game, [[17.5, 27.1], [7.8, 31.5], [28.7, 35.5], [12.6, 35.9], [30.5, 31.5], [12, 35.5], [33, 29], [8.5, 27], [21.5, 28.5], [30, 25.5], [11, 25.5], [5.5, 36]], 버틸초, 심음);
  return { 잰것, 이김: /승/.test(await 읽기(game, '//*[@name=Txt]')), 판: 뒤.판.slice(-12), 끝: 뒤.끝글 };
}

export async function 첫웨이브(game: GameDriver): Promise<string[]> {
  const 잰것: string[] = [];
  const 들어감 = await 다시스테이지로(game);
  잰것.push(`들어감 ${들어감.들어감} 웨이브 ${await 읽기(game, '//*[@name=WaveText]')} 고기 ${await 고기수(game)}`);
  const 앞자리 = await 위치(game);
  await game.key('RightArrow', { duration: 1 });
  const 뒤자리 = await 위치(game);
  잰것.push(`→1초 ${앞자리.join(',')}→${뒤자리.join(',')} dx ${Math.round((뒤자리[0] - 앞자리[0]) * 100) / 100}`);
  const F앞 = await 고기수(game);
  await game.key('F');
  잰것.push(`빈자리 F 고기 ${F앞}→${await 고기바뀜(game, F앞, 3_000)}`);
  const 끝 = Date.now() + 40_000;
  let 처음 = '';
  while (Date.now() < 끝) {
    const 웨이브 = await 읽기(game, '//*[@name=WaveText]');
    if (웨이브.startsWith('1/')) {
      처음 = `웨이브 ${웨이브} 남은 ${await 읽기(game, '//*[@name=LeftMonsterText]')}`;
      break;
    }
  }
  잰것.push(처음 || '40초 안에 1웨이브 안 옴');
  return 잰것;
}

export async function 남은수(game: GameDriver, 초 = 30): Promise<string[]> {
  const 본것: string[] = [];
  const 끝 = Date.now() + 초 * 1000;
  while (Date.now() < 끝) {
    const 줄 = `${await 읽기(game, '//*[@name=WaveText]')} ${await 읽기(game, '//*[@name=LeftMonsterText]')}`;
    if (본것.at(-1)?.endsWith(줄) !== true) 본것.push(`${Math.round((초 * 1000 - (끝 - Date.now())) / 100) / 10}s ${줄}`);
  }
  return 본것.slice(0, 40);
}
