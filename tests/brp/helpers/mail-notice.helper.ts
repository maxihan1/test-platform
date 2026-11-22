import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 공통HUD } from '../components/hud.component.js';
import { 알림띠 } from '../components/toast.component.js';
import { 우편함창 } from '../pages/mailbox.page.js';
import { 로그인하기 } from './game-enter.helper.js';
import { 공지올리기, type 지급내용, 우편지급, 지급이력, 지급회수, 캐릭터읽기 } from './game-state.helper.js';
import { 색글떼기 } from './gm.helper.js';
import { type 색, 태그색 } from './screen-check.helper.js';

export async function 우편숫자(hud: 공통HUD): Promise<number | null> {
  const 맞음 = /<color=#[0-9a-fA-F]{6,8}>(\d+)<\/color>/.exec(await hud.메뉴글('우편'));
  return 맞음?.[1] === undefined ? null : Number(맞음[1]);
}

export async function 우편글색(hud: 공통HUD): Promise<색 | null> {
  return 태그색(await hud.메뉴글('우편'));
}

export async function 우편숫자기다리기(hud: 공통HUD, 숫자: number, 한도ms = 60_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 우편숫자(hud)) === 숫자) return true;
    if (Date.now() > 끝) return false;
  }
}

export async function 캐릭터번호(admin: APIRequestContext, 이름: string): Promise<number> {
  return (await 캐릭터읽기(admin, 이름)).id;
}

export async function 우편지급하고기다리기(admin: APIRequestContext, hud: 공통HUD, 이름: string, 내용: 지급내용 | 지급내용[], 기다릴숫자: number, 한도ms = 60_000): Promise<{ 번호: number[]; 도착: boolean }> {
  const 번호들: number[] = [];
  const 캐릭터 = await 캐릭터번호(admin, 이름);
  for (const 한건 of Array.isArray(내용) ? 내용 : [내용]) 번호들.push(await 우편지급(admin, 캐릭터, 한건));
  return { 번호: 번호들, 도착: await 우편숫자기다리기(hud, 기다릴숫자, 한도ms) };
}

export async function 지급상태기다리기(admin: APIRequestContext, 지급번호: number, 상태: string, 한도ms = 15_000): Promise<string> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 줄 = (await 지급이력(admin, 50)).find((g) => g.id === 지급번호);
    const 상태들 = 줄 === undefined ? '' : 줄.mails.map((m) => m.status).join(',');
    if (상태들 === 상태 || Date.now() > 끝) return 상태들;
  }
}

export async function 캐릭터생길때까지(admin: APIRequestContext, 이름: string, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    try {
      await 캐릭터읽기(admin, 이름);
      return true;
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('못 찾았습니다'))) throw e;
    }
    if (Date.now() > 끝) return false;
  }
}

export async function 캐릭터있나(admin: APIRequestContext, 이름: string): Promise<boolean> {
  try {
    await 캐릭터읽기(admin, 이름);
    return true;
  } catch (e) {
    if (e instanceof Error && e.message.includes('못 찾았습니다')) return false;
    throw e;
  }
}

export async function 공지띠글기다리기(game: GameDriver, 글: string, 한도ms = 80_000): Promise<boolean> {
  return game.waitFor(공통HUD.공지띠글주소, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 공지띠글바뀔때까지(game: GameDriver, 이전글: string, 한도ms = 30_000): Promise<string | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 글 = await game.text(공통HUD.공지띠글주소);
    if (글 !== 이전글) return 글;
    if (Date.now() > 끝) return null;
  }
}

export async function 알림글세기(game: GameDriver, 글: string, 한도ms = 8_000): Promise<number> {
  const 알림 = new 알림띠(game);
  const 끝 = Date.now() + 한도ms;
  let 가장많이 = 0;
  while (Date.now() < 끝) {
    const 개수 = (await 알림.글들()).filter((줄) => 줄.includes(글)).length;
    if (개수 > 가장많이) 가장많이 = 개수;
  }
  return 가장많이;
}

export async function 빠르게두번누르기(game: GameDriver, 주소: string): Promise<number> {
  const 결과 = await Promise.allSettled([game.click(주소), game.click(주소)]);
  const 눌림 = 결과.filter((r) => r.status === 'fulfilled').length;
  if (눌림 === 0) throw new Error(`빠르게 두 번 누르기가 모두 실패했습니다(${주소})`);
  return 눌림;
}

const 가방창 = '/Showcase HUD/Window 가방';
const 가방줄뿌리 = `${가방창}/Panel 가방/Scroll/Content`;

async function 가방열기(game: GameDriver): Promise<void> {
  await new 공통HUD(game).메뉴누르기('가방');
  await game.waitFor(`${가방창}/Panel 가방`, { timeoutMs: 10_000 });
}

async function 가방닫기(game: GameDriver): Promise<void> {
  await game.click(`${가방창}/Panel 가방/Button 닫기`);
  await game.waitFor(가방창, { gone: true, timeoutMs: 10_000 });
}

async function 가방줄글들(game: GameDriver): Promise<string[]> {
  const 모은: string[] = [];
  for (let i = 0; i < 30; i += 1) {
    const 주소 = `${가방줄뿌리}/Row[${String(i)}]/Label[0]/Text`;
    if ((await game.find(주소)) === null) break;
    모은.push(색글떼기(await game.text(주소)));
  }
  return 모은;
}

export async function 가방줄들(game: GameDriver): Promise<string[]> {
  await 가방열기(game);
  const 줄들 = await 가방줄글들(game);
  await 가방닫기(game);
  return 줄들;
}

export async function 가방에서팔기(game: GameDriver, 이름: string): Promise<void> {
  await 가방열기(game);
  const 줄들 = await 가방줄글들(game);
  const 번호 = 줄들.findIndex((글) => 글.includes(이름));
  if (번호 < 0) throw new Error(`가방에 「${이름}」 줄이 없습니다 — 있는 줄: ${줄들.join(' | ')}`);
  const 글주소 = `${가방줄뿌리}/Row[${String(번호)}]/Label[0]/Text`;
  const 전 = await game.text(글주소);
  await game.click(`${가방줄뿌리}/Row[${String(번호)}]/*[contains(@name,판매)]`);
  const 끝 = Date.now() + 10_000;
  for (;;) {
    const 지금 = (await game.find(글주소)) === null ? null : await game.text(글주소);
    if (지금 !== 전) break;
    if (Date.now() > 끝) throw new Error(`「${이름}」을 판 뒤에도 가방 줄이 그대로입니다`);
  }
  await 가방닫기(game);
}

const 상점창 = '/Showcase HUD/Window 상점';
const 상점줄뿌리 = `${상점창}/Panel 상점/Scroll/Content`;

async function 상점줄글들(game: GameDriver): Promise<string[]> {
  const 모은: string[] = [];
  for (let i = 0; i < 30; i += 1) {
    const 주소 = `${상점줄뿌리}/Row[${String(i)}]/Label[0]/Text`;
    if ((await game.find(주소)) === null) break;
    모은.push(색글떼기(await game.text(주소)));
  }
  return 모은;
}

export async function 상점에서사기(game: GameDriver, 이름: string): Promise<void> {
  await new 공통HUD(game).메뉴누르기('상점');
  await game.waitFor(`${상점창}/Panel 상점`, { timeoutMs: 10_000 });
  const 번호 = (await 상점줄글들(game)).findIndex((글) => 글 === 이름);
  if (번호 < 0) throw new Error(`상점에 「${이름}」 줄이 없습니다`);
  for (let 시도 = 0; 시도 < 6; 시도 += 1) {
    const 패널 = await game.find(`${상점창}/Panel 상점`);
    const 목표 = await game.find(`${상점줄뿌리}/Row[${String(번호)}]`);
    if (패널?.rect === undefined || 목표?.rect === undefined) break;
    const 안에있나 = (r: number[]): boolean => (r[1] ?? 0) >= (패널.rect?.[1] ?? 0) && (r[1] ?? 0) + (r[3] ?? 0) <= (패널.rect?.[1] ?? 0) + (패널.rect?.[3] ?? 0);
    if (안에있나(목표.rect)) break;
    const 보이는: number[] = [];
    for (let i = 0; i <= 번호; i += 1) {
      const 줄 = await game.find(`${상점줄뿌리}/Row[${String(i)}]`);
      if (줄?.rect !== undefined && 안에있나(줄.rect)) 보이는.push(i);
    }
    const 위 = 보이는[0];
    const 아래 = 보이는[보이는.length - 1];
    if (위 === undefined || 아래 === undefined || 위 === 아래) break;
    await game.drag(`${상점줄뿌리}/Row[${String(아래)}]`, `${상점줄뿌리}/Row[${String(위)}]`);
  }
  await game.click(`${상점줄뿌리}/Row[${String(번호)}]/Button 구매`);
  await game.click(`${상점창}/Panel 상점/Button 닫기`);
  await game.waitFor(상점창, { gone: true, timeoutMs: 10_000 });
}

export async function 우편함로그인(game: GameDriver, 아이디: string, 비밀번호: string): Promise<{ 접속: boolean; 비었음: boolean }> {
  const 로비 = await 로그인하기(game, 아이디, 비밀번호);
  if (로비 === null) return { 접속: false, 비었음: false };
  await 로비.hud.그려질때까지();
  return { 접속: true, 비었음: (await 우편숫자(로비.hud)) === null };
}

export async function 우편지급하고창열기(
  game: GameDriver,
  admin: APIRequestContext,
  이름: string,
  내용들: 지급내용[],
  기다릴숫자: number,
  한도ms = 60_000,
): Promise<{ 창: 우편함창; 번호: number[]; 도착: boolean }> {
  const { 번호, 도착 } = await 우편지급하고기다리기(admin, new 공통HUD(game), 이름, 내용들, 기다릴숫자, 한도ms);
  const 창 = await 우편함창.열기(game);
  const 마지막 = 내용들[내용들.length - 1];
  if (마지막 !== undefined) await 창.줄기다리기(마지막.제목, 15_000);
  return { 창, 번호, 도착 };
}

export async function 첨부비운우편만들기(game: GameDriver, admin: APIRequestContext, 이름: string, 내용들: 지급내용[]): Promise<{ 창: 우편함창; 비웠음: boolean }> {
  const { 창 } = await 우편지급하고창열기(game, admin, 이름, 내용들, 내용들.length);
  await 창.모두받기누르기();
  let 비웠음 = true;
  for (let i = 0; i < 내용들.length; i += 1) 비웠음 = (await 창.첨부없음이될때까지(i)) && 비웠음;
  return { 창, 비웠음 };
}

export async function 우편숫자사라질때까지(hud: 공통HUD, 한도ms = 20_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if ((await 우편숫자(hud)) === null) return true;
    if (Date.now() > 끝) return false;
  }
}

export async function 알림글읽기(game: GameDriver, 글: string, 한도ms = 10_000): Promise<string | null> {
  const 주소 = await new 알림띠(game).그글줄주소(글, 한도ms);
  return 주소 === null ? null : game.text(주소);
}

export async function 지급회수시도(admin: APIRequestContext, 지급번호: number): Promise<{ 회수됨: boolean; 오류: string }> {
  try {
    await 지급회수(admin, 지급번호);
    return { 회수됨: true, 오류: '' };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('지급 회수')) return { 회수됨: false, 오류: e.message };
    throw e;
  }
}

export async function 공지켜고로비들어가기(
  game: GameDriver,
  admin: APIRequestContext,
  아이디: string,
  비밀번호: string,
  공지들: { 제목: string; 본문: string }[],
  한도ms = 80_000,
): Promise<{ 접속: boolean; 보임: boolean }> {
  for (const 공지 of 공지들) await 공지올리기(admin, 공지.제목, 공지.본문);
  const 로비 = await 로그인하기(game, 아이디, 비밀번호);
  if (로비 === null) return { 접속: false, 보임: false };
  const 첫 = 공지들[0];
  const 보임 = await 공지띠글기다리기(game, 첫 === undefined ? '' : 첫.제목, 한도ms);
  return { 접속: true, 보임 };
}

export async function 골드늘어난값(hud: 공통HUD, 전: number, 기다릴값: number, 한도ms = 10_000): Promise<number> {
  await hud.골드가될때까지(전 + 기다릴값, 한도ms);
  return (await hud.골드()) - 전;
}

export async function 가방개수(game: GameDriver, 이름: string): Promise<number> {
  const 줄 = (await 가방줄들(game)).find((글) => 글.startsWith(이름));
  if (줄 === undefined) return 0;
  const 맞음 = /x(\d+)\s*$/.exec(줄);
  return 맞음?.[1] === undefined ? 1 : Number(맞음[1]);
}

export async function 공지띠글유지(game: GameDriver, 글: string, 한도ms: number): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 보임 = (await game.find(공통HUD.공지띠글주소)) !== null && (await game.text(공통HUD.공지띠글주소)).includes(글);
    if (!보임) return false;
    if (Date.now() > 끝) return true;
  }
}
