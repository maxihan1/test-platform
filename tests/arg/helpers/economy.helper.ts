import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';

import { 공통HUD, 글만 } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 우편함창 } from '../pages/mail.page.js';
import { 상점창 } from '../pages/shop.page.js';
import { 상단바골드, 우편보내기, type 캐릭터값 } from './game-state.helper.js';

export const 상점가: Record<string, number> = {
  '녹슨 단검': 80,
  '강철 롱소드': 350,
  '룬 새김 도끼': 900,
  '가죽 갑옷': 100,
  '사슬 갑옷': 400,
  '행운의 반지': 300,
  '현자의 목걸이': 300,
  '체력 물약': 30,
  '조약돌': 3,
};

export const 장착칸이름: Record<string, '무기' | '갑옷' | '장신구'> = {
  '녹슨 단검': '무기',
  '강철 롱소드': '무기',
  '룬 새김 도끼': '무기',
  '불꽃의 검': '무기',
  '가죽 갑옷': '갑옷',
  '사슬 갑옷': '갑옷',
  '행운의 반지': '장신구',
  '현자의 목걸이': '장신구',
};

export async function 조건될때까지(조건: () => Promise<boolean>, 시간 = 10_000): Promise<boolean> {
  const 끝 = Date.now() + 시간;
  do {
    if (await 조건()) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 골드될때까지(game: GameDriver, 값: number, 시간 = 10_000): Promise<boolean> {
  return await 조건될때까지(async () => (await 상단바골드(game)) === 값, 시간);
}

export async function 알림없어질때까지(game: GameDriver, 시간 = 10_000): Promise<boolean> {
  const 알림 = new 공통HUD(game);
  return await 조건될때까지(async () => (await 알림.알림글들()).length === 0, 시간);
}

export async function 알림글읽기(game: GameDriver, 앞글: string, 시간 = 10_000): Promise<string> {
  const 알림 = new 공통HUD(game);
  if (!(await 알림.알림기다리기(앞글, 시간))) return '';
  const 글들 = await 알림.알림글들();
  return 글들.find((글) => 글.includes(앞글)) ?? '';
}

export async function 상점에서사기(game: GameDriver, 이름들: string[]): Promise<void> {
  const 상점 = await 상점창.열기(game);
  for (const 이름 of 이름들) {
    const 값 = 상점가[이름];
    if (값 === undefined) throw new Error(`상점가를 모르는 아이템이다: ${이름}`);
    const 전 = await 상단바골드(game);
    if (!(await 상점.구매(이름))) throw new Error(`상점에 「${이름}」 줄이 없다`);
    if (!(await 골드될때까지(game, 전 - 값))) throw new Error(`「${이름}」 을 산 뒤 골드가 ${String(전 - 값)} 이 되지 않았다`);
  }
  await 상점.닫기누르기();
}

export async function 가방에서장착(game: GameDriver, 이름: string): Promise<void> {
  const 칸 = 장착칸이름[이름];
  if (칸 === undefined) throw new Error(`장착칸을 모르는 아이템이다: ${이름}`);
  const 가방 = await 가방창.열기(game);
  if (!(await 가방.장착(이름))) throw new Error(`가방에 「${이름}」 줄이나 「장착」 버튼이 없다`);
  if (!(await 조건될때까지(async () => (await 가방.장착칸글(칸)).includes(이름)))) throw new Error(`「${이름}」 을 장착한 뒤 ${칸} 칸에 보이지 않는다`);
  await 가방.닫기누르기();
}

export async function 가방에서팔기(game: GameDriver, 이름: string, 횟수 = 1, 닫기 = true): Promise<void> {
  const 가방 = await 가방창.열기(game);
  for (let 번 = 0; 번 < 횟수; 번 += 1) {
    const 줄 = await 가방.목록.이름줄(이름);
    if (줄 === null) throw new Error(`가방에 「${이름}」 줄이 없다`);
    const 전 = await 가방.목록.칸글(줄, 0);
    await 가방.판매(이름);
    await 조건될때까지(async () => {
      const 지금 = await 가방.목록.이름줄(이름);
      return 지금 === null || (await 가방.목록.칸글(지금, 0)) !== 전;
    });
  }
  if (닫기) await 가방.닫기누르기();
}

export function 우편제목(키: string): string {
  return `[QA] ${키}`;
}

export async function 우편넣기(
  admin: APIRequestContext,
  아이디: string,
  키: string,
  아이템: { 이름: string; 개수: number }[] = [],
  골드 = 0,
): Promise<number> {
  return await 우편보내기(admin, 아이디, { 제목: 우편제목(키), 아이템, 골드 });
}

export async function 우편줄기다리기(game: GameDriver, 키: string, 시간 = 60_000): Promise<우편함창> {
  const 끝 = Date.now() + 시간;
  let 창 = await 우편함창.열기(game);
  for (;;) {
    await game.waitFor(`//*[contains(@text,${키})]`, { timeoutMs: 5_000 }).catch(() => undefined);
    if ((await 창.목록.이름줄(우편제목(키))) !== null || Date.now() >= 끝) return 창;
    await 창.닫기누르기();
    창 = await 우편함창.열기(game);
  }
}

export async function 우편받기(game: GameDriver, 키: string): Promise<void> {
  const 창 = await 우편줄기다리기(game, 키);
  const 줄 = await 창.목록.이름줄(우편제목(키));
  if (줄 === null) throw new Error(`우편 「${우편제목(키)}」 이 우편함에 오지 않았다`);
  await 창.받기(우편제목(키));
  await game.waitFor(`${줄}/Button 받기`, { gone: true, timeoutMs: 10_000 });
  await 창.닫기누르기();
}

export async function 우편함비우기(game: GameDriver): Promise<void> {
  const 창 = await 우편함창.열기(game);
  for (let 번 = 0; 번 < 20; 번 += 1) {
    const 줄들 = await 창.목록.줄경로들();
    if (줄들.length === 0) break;
    let 지웠다 = false;
    for (const 줄 of 줄들) {
      const 삭제 = await 창.목록.줄버튼(줄, '삭제');
      if (삭제 === null || (await 창.목록.칸글(줄, 2)) !== '첨부 없음') continue;
      await game.click(삭제);
      await 조건될때까지(async () => (await 창.목록.줄수()) < 줄들.length);
      지웠다 = true;
      break;
    }
    if (지웠다) continue;
    await 창.모두받기누르기();
    const 받았다 = await 조건될때까지(async () => {
      for (const 줄 of await 창.목록.줄경로들()) if ((await 창.목록.칸글(줄, 2)) === '첨부 없음') return true;
      return false;
    });
    if (!받았다) break;
  }
  await 창.닫기누르기();
}

export function 체력숫자(상태: Record<string, string>): number {
  return Number((상태['체력'] ?? '').split('/')[0]);
}

export function 서버가방수량(값: 캐릭터값, 이름: string): number {
  return 값.items[이름] ?? 0;
}

export function 색이름(색: number[]): string {
  const [빨 = 0, 초 = 0, 파 = 0] = 색;
  const 큰값 = Math.max(빨, 초, 파);
  const 차 = 큰값 - Math.min(빨, 초, 파);
  if (큰값 === 0) return '검정';
  if (차 / 큰값 < 0.15) return '회색';
  let 색상 = 0;
  if (큰값 === 빨) 색상 = 60 * (((초 - 파) / 차 + 6) % 6);
  else if (큰값 === 초) 색상 = 60 * ((파 - 빨) / 차 + 2);
  else 색상 = 60 * ((빨 - 초) / 차 + 4);
  if (색상 < 15 || 색상 >= 345) return '빨강';
  if (색상 >= 30 && 색상 < 60) return '금색';
  if (색상 >= 90 && 색상 < 165) return '초록';
  return '기타';
}

export async function 글자색읽기(game: GameDriver, 주소: string, 끝에서 = false): Promise<number[]> {
  const 찾은것 = await game.find(주소);
  const 태그들 = [...(찾은것?.text ?? '').matchAll(/<color=#([0-9a-fA-F]{6})/g)];
  const 태그 = 끝에서 ? 태그들.at(-1) : 태그들[0];
  if (태그 !== undefined) {
    const 값 = 태그[1] ?? '000000';
    return [0, 2, 4].map((자리) => parseInt(값.slice(자리, 자리 + 2), 16) / 255);
  }
  return (await game.get(주소, 'TextMeshProUGUI.color')) as number[];
}

export async function 바탕색읽기(game: GameDriver, 주소: string): Promise<number[]> {
  return (await game.get(주소, 'Image.color')) as number[];
}

export async function 줄글자(game: GameDriver, 주소: string): Promise<string> {
  const 찾은것 = await game.find(주소);
  return 찾은것 === null ? '' : 글만(찾은것.text ?? '');
}

export async function 우편메뉴글될때까지(game: GameDriver, 글: string, 시간 = 45_000): Promise<boolean> {
  const 알림 = new 공통HUD(game);
  return await 조건될때까지(async () => (await 알림.우편메뉴글()) === 글, 시간);
}

export async function 우편메뉴숫자색(game: GameDriver): Promise<string> {
  return 색이름(await 글자색읽기(game, `${공통HUD.메뉴버튼('우편')}/Text`, true));
}
