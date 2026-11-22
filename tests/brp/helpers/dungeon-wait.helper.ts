import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 봇시키기 } from './game-state.helper.js';
import { type 화면자리, 화면자리읽기, 봇두기, type 색값, 글색읽기 } from './dungeon.helper.js';

export async function 갈래B값될때까지<T>(읽기: () => Promise<T>, 맞나: (값: T) => boolean, 한도ms = 10_000): Promise<T> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 값 = await 읽기();
    if (맞나(값) || Date.now() > 끝) return 값;
  }
}

export async function 갈래B뜰때까지(game: GameDriver, 주소: string, 한도ms = 10_000, 사라짐 = false): Promise<boolean> {
  return game.waitFor(주소, { gone: 사라짐, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 갈래B머리위숫자(game: GameDriver, 주소: string, 한도ms = 10_000): Promise<{ 뜸: boolean; 글: string; 색: 색값 | null }> {
  if (!(await 갈래B뜰때까지(game, 주소, 한도ms))) return { 뜸: false, 글: '', 색: null };
  return { 뜸: true, 색: await 글색읽기(game, 주소), 글: await game.text(주소) };
}

export async function 갈래B떴다사라질때까지재기(game: GameDriver, 주소: string, 한도ms = 5_000): Promise<{ 떴다: boolean; 사라짐: boolean; 걸린초: number }> {
  const 떴다 = await 갈래B뜰때까지(game, 주소);
  if (!떴다) return { 떴다, 사라짐: false, 걸린초: 0 };
  const 시작 = Date.now();
  const 사라짐 = await 갈래B뜰때까지(game, 주소, 한도ms, true);
  return { 떴다, 사라짐, 걸린초: (Date.now() - 시작) / 1000 };
}

export async function 갈래B큰글읽기(game: GameDriver, 주소: string, 한도ms = 10_000): Promise<{ 글: string; 색: 색값; 자리: 화면자리 } | null> {
  if (!(await 갈래B뜰때까지(game, 주소, 한도ms))) return null;
  return { 색: await 글색읽기(game, 주소), 자리: await 화면자리읽기(game, 주소), 글: await game.text(주소) };
}

export async function 갈래B큰글주소(game: GameDriver, 글: string, 한도ms = 10_000): Promise<string | null> {
  const 주소들 = ['/Showcase HUD/Label/Text', ...[0, 1, 2, 3].map((i) => `/Showcase HUD/Label[${String(i)}]/Text`)];
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    for (const 주소 of 주소들) {
      try {
        if ((await game.find(주소)) !== null && (await game.text(주소)).includes(글)) return 주소;
      } catch (e) {
        if (!(e instanceof Error && (e.message.includes('하나를 고를 수 없습니다') || e.message.includes('없습니다')))) throw e;
      }
    }
    if (Date.now() > 끝) return null;
  }
}

async function 갈래B찾기(game: GameDriver, 주소: string): Promise<boolean> {
  try {
    return (await game.find(주소)) !== null;
  } catch (e) {
    if (e instanceof Error && e.message.includes('하나를 고를 수 없습니다')) return true;
    throw e;
  }
}

export async function 갈래B이름표글있나(game: GameDriver, 글: string): Promise<boolean> {
  return 갈래B찾기(game, `/BossRoomHudCanvas/UIStateDisplay(Clone)//*[contains(@text,"${글}")]`);
}

export async function 갈래B알림줄글(game: GameDriver, 글: string, 한도ms = 15_000): Promise<string | null> {
  const 주소 = `/BossRoomHudCanvas/MessageFeed/Mask/MessageFeed//*[contains(@text,"${글}")]`;
  return (await 갈래B값될때까지(() => 갈래B찾기(game, 주소), (있음) => 있음, 한도ms)) ? game.text(주소) : null;
}

export async function 갈래B임프수(game: GameDriver): Promise<number> {
  let 수 = 0;
  while ((await game.find(`/Imp(Clone)[${String(수)}]`)) !== null) 수 += 1;
  return 수;
}

export async function 갈래B임프퀘스트읽기(game: GameDriver, 메뉴열기: () => Promise<void>): Promise<{ 이름: string; 진행: number }> {
  const 줄 = '/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Scroll/Content/Row[0]';
  await 메뉴열기();
  await game.waitFor(`${줄}/Label[2]/Text`, { timeoutMs: 10_000 });
  const 값 = { 이름: await game.text(`${줄}/Label[0]/Text`), 진행: Number((await game.text(`${줄}/Label[2]/Text`)).split('/')[0]) };
  await game.click('/Showcase HUD/Window 일일 퀘스트/Panel 일일 퀘스트/Button 닫기');
  await game.waitFor('/Showcase HUD/Window 일일 퀘스트', { gone: true, timeoutMs: 10_000 });
  return 값;
}

export async function 갈래B봇먼저던전열기(admin: APIRequestContext, 아이디: string, 비밀번호: string, 한도ms = 60_000): Promise<boolean> {
  const 봇 = await 봇두기(admin, 아이디, 비밀번호, 2);
  const 열림 = await 갈래B값될때까지(
    async () => String(((await (await admin.get('/test/state')).json()) as { scene?: string }).scene ?? ''),
    (장면) => 장면.includes('BossRoom'),
    한도ms,
  );
  if (!열림.includes('BossRoom')) return false;
  await 봇시키기(admin, 봇, 'gm:god');
  return true;
}

export async function 창열려있나(game: GameDriver, 이름: '가방' | '상점'): Promise<boolean> {
  return (await game.find(`/Showcase HUD/Window ${이름}`)) !== null;
}

export async function 창닫힘기다리기(game: GameDriver, 이름: '가방' | '상점', 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`/Showcase HUD/Window ${이름}`, { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 창닫기(game: GameDriver, 이름: '가방' | '상점', 방법: '닫기' | '바깥'): Promise<void> {
  const 창 = `/Showcase HUD/Window ${이름}`;
  if (방법 === '닫기') await game.click(`${창}/Panel ${이름}/Button 닫기`);
  else await game.click(`${창}/Shade`, { at: [0.97, 0.97] });
}

export async function 가방능력줄(game: GameDriver, 글?: string, 한도ms = 10_000): Promise<string> {
  const 주소 = '/Showcase HUD/Window 가방/Panel 가방/Gear/Label/Text';
  if (글 !== undefined) await game.waitFor(주소, { text: 글, timeoutMs: 한도ms }).then(() => true, () => false);
  return game.text(주소);
}
