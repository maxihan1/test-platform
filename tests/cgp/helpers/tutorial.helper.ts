import type { GameDriver } from '@platform/kit';

import { 걸어가기, 고기수, 위치 } from './stage.helper.js';

const 카드제목 = '/TutorialHudCanvas/HudGuide/Card/Title';
const 카드글 = '/TutorialHudCanvas/HudGuide/Card/Body';
const 과제글 = '/TutorialHudCanvas/TutorialMessage/TutorialMessageText';
const 키안내 = '/TutorialHudCanvas/KeyGuide';

export interface 튜토리얼화면 {
  카드: string;
  카드본문: string;
  과제: string;
  키: string[];
}

async function 글(game: GameDriver, 주소: string): Promise<string> {
  if ((await game.find(주소).catch(() => null)) === null) return '';
  return (await game.text(주소).catch(() => '')).replace(/<[^>]+>/g, '').trim();
}

export async function 튜토리얼읽기(game: GameDriver): Promise<튜토리얼화면> {
  const 키: string[] = [];
  for (let n = 0; n < 4; n += 1) {
    const 이름 = await 글(game, `${키안내}/Slot${n}/Text`);
    if (이름 === '') continue;
    const 누름 = await 글(game, `${키안내}/Slot${n}/Key/Text`);
    키.push(누름 === '' ? 이름 : `${이름} ${누름}`);
  }
  return { 카드: await 글(game, 카드제목), 카드본문: await 글(game, 카드글), 과제: await 글(game, 과제글), 키 };
}

async function 바뀔때까지(game: GameDriver, 앞: 튜토리얼화면, 한도ms: number): Promise<튜토리얼화면> {
  const 끝 = Date.now() + 한도ms;
  let 지금 = await 튜토리얼읽기(game);
  while (지금.카드 === 앞.카드 && 지금.과제 === 앞.과제 && Date.now() < 끝) 지금 = await 튜토리얼읽기(game);
  return 지금;
}

async function 되풀이(game: GameDriver, 키: string, 앞: 튜토리얼화면, 횟수: number): Promise<튜토리얼화면> {
  let 지금 = 앞;
  for (let i = 0; i < 횟수 && 지금.과제 === 앞.과제 && 지금.카드 === 앞.카드; i += 1) {
    await game.key(키);
    지금 = await 바뀔때까지(game, 앞, 700);
  }
  return 지금;
}

async function 식물주소(game: GameDriver): Promise<string | null> {
  for (let 레벨 = 5; 레벨 >= 1; 레벨 -= 1) {
    const 주소 = `/PooledObjectsRoot/RedFlower_Level${레벨}/RedFlower_Level${레벨}(Clone)`;
    if ((await game.find(주소).catch(() => null)) !== null) return 주소;
  }
  return null;
}

export async function 튜토리얼식물(game: GameDriver): Promise<{ 주소: string; 레벨: number; 체력: number } | null> {
  const 주소 = await 식물주소(game);
  if (주소 === null) return null;
  const 레벨 = Number(/_Level(\d)/.exec(주소)?.[1] ?? 0);
  const 체력 = Number(await game.get(주소, 'PlantStatus.CurHP.Value').catch(() => NaN));
  return { 주소, 레벨, 체력 };
}

async function 식물보고서기(game: GameDriver): Promise<void> {
  const 주소 = await 식물주소(game);
  if (주소 === null) return;
  const p = (await game.get(주소, 'Transform.position')) as number[];
  await 걸어가기(game, [p[0] - 0.7, p[2]], 4);
  await game.key('RightArrow', { duration: 0.08 });
}

export async function 튜토리얼한걸음(game: GameDriver): Promise<{ 본것: 튜토리얼화면; 뒤: 튜토리얼화면 }> {
  const 본것 = await 튜토리얼읽기(game);
  if (본것.카드 !== '') {
    await game.key('Return');
    return { 본것, 뒤: await 바뀔때까지(game, 본것, 4_000) };
  }
  const 과제 = 본것.과제;
  if (과제.includes('목표 지점')) {
    for (const 점 of [[24.8, 23.0], [25.2, 8.0], [28.9, 7.3]] as [number, number][]) await 걸어가기(game, 점, 8);
  } else if (과제.includes('폭탄')) {
    return { 본것, 뒤: await 되풀이(game, 'Q', 본것, 3) };
  } else if (과제.includes('처치')) {
    return { 본것, 뒤: await 되풀이(game, 'Z', 본것, 20) };
  } else if (과제.includes('공격')) {
    await 걸어가기(game, [34.7, 12.0], 8);
    await game.key('RightArrow', { duration: 0.08 });
    return { 본것, 뒤: await 되풀이(game, 'Z', 본것, 10) };
  } else if (과제.includes('고기를 주우')) {
    const 고기 = (await game.get('/PooledObjectsRoot/MeatDrop/MeatDrop(Clone)', 'Transform.position').catch(() => null)) as number[] | null;
    if (고기) await 걸어가기(game, [고기[0], 고기[2]], 6);
  } else if (과제.includes('식물을 심으')) {
    await game.key('X');
  } else if (과제.includes('심을 수 없')) {
    const [x, z] = await 위치(game);
    await 걸어가기(game, [x - 2.5, z], 3);
    await game.key('X');
  } else if (과제.includes('회복')) {
    await 식물보고서기(game);
    await game.key('C');
  } else if (과제.includes('레벨') || 과제.includes('키우')) {
    await 식물보고서기(game);
    const 끝 = Date.now() + 25_000;
    while (Date.now() < 끝 && (await 튜토리얼식물(game))?.레벨 !== 5 && (await 고기수(game)) > 0) await game.key('C', { duration: 0.6 });
  } else if (과제.includes('회수')) {
    await 식물보고서기(game);
    return { 본것, 뒤: await 되풀이(game, 'F', 본것, 3) };
  }
  return { 본것, 뒤: await 바뀔때까지(game, 본것, 4_000) };
}

export async function 튜토리얼여러걸음(game: GameDriver, 걸음수: number): Promise<string[]> {
  const 기록: string[] = [];
  let 헛걸음 = 0;
  for (let i = 0; i < 걸음수 && 헛걸음 < 3; i += 1) {
    const { 본것, 뒤 } = await 튜토리얼한걸음(game);
    기록.push(`${본것.카드 || '과제'}|${본것.과제}|${본것.키.join(',')} → ${뒤.카드 || 뒤.과제}`);
    헛걸음 = 뒤.카드 === 본것.카드 && 뒤.과제 === 본것.과제 ? 헛걸음 + 1 : 0;
  }
  return 기록;
}

export async function 튜토리얼막기(game: GameDriver, 버틸초 = 150): Promise<{ 이김: boolean; 판: string[] }> {
  const 판: string[] = [];
  const 시작 = Date.now();
  const 초 = (): number => Math.round((Date.now() - 시작) / 1000);
  for (const 자리 of [[34.2, 9.3], [34.2, 14.1], [30.0, 6.4], [27.0, 6.6], [22.0, 12.0], [22.0, 18.0]] as [number, number][]) {
    if ((await 고기수(game)) < 5) break;
    const 감 = await 걸어가기(game, 자리, 6);
    const 앞 = await 고기수(game);
    await game.key('X');
    await game.key('X');
    판.push(`${초()}s 심기 ${감.자리.join(',')} 고기 ${앞}→${await 고기수(game)}`);
  }
  while (Date.now() - 시작 < 버틸초 * 1000) {
    const 끝글 = await 글(game, '//*[@name=Txt]');
    if (/승/.test(끝글)) return { 이김: true, 판 };
    if ((await game.find('/TutorialHudCanvas').catch(() => null)) === null) {
      판.push(`${초()}s 튜토리얼 장면이 닫힘 · 끝 글 ${끝글}`);
      return { 이김: false, 판 };
    }
    await 걸어가기(game, [35.6, 10.5], 3);
    for (let i = 0; i < 6; i += 1) await game.key('Z');
    if (판.length < 40) 판.push(`${초()}s 남은 ${await 글(game, '//*[@name=LeftMonsterText]')} 웨이브 ${await 글(game, '//*[@name=WaveText]')}`);
  }
  return { 이김: false, 판 };
}
