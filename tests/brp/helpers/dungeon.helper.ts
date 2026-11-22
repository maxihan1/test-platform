import type { APIRequestContext } from '@playwright/test';
import type { GameDriver } from '@platform/kit';
import { 채팅창 } from '../pages/chat.page.js';
import { type 직업, 로비화면 } from '../pages/lobby.page.js';
import { 던전입장 } from './game-enter.helper.js';
import { 봇시키기, 봇켜기 } from './game-state.helper.js';
import { GM데이터, GM모두처치, GM스탯, GM임프불러내기, 색글떼기 } from './gm.helper.js';

export interface 화면자리 {
  가로: number;
  세로: number;
  너비: number;
  높이: number;
}

export async function 화면자리읽기(game: GameDriver, 주소: string): Promise<화면자리> {
  const 찾음 = await game.find(주소);
  if (찾음?.rect === undefined || 찾음.screen === undefined) throw new Error(`화면 자리를 못 읽었습니다(${주소})`);
  const [x, y, w, h] = 찾음.rect;
  const [화면너비, 화면높이] = 찾음.screen;
  return { 가로: (x + w / 2) / 화면너비, 세로: 1 - (y + h / 2) / 화면높이, 너비: w / 화면너비, 높이: h / 화면높이 };
}

export async function 임프하나두기(game: GameDriver): Promise<void> {
  await GM모두처치(game);
  await GM임프불러내기(game);
}

export async function 봇두기(admin: APIRequestContext, 아이디: string, 비밀번호: string, 자리: number): Promise<string> {
  const 봇 = await 봇켜기(admin, 아이디, 비밀번호);
  await 봇시키기(admin, 봇, `seat:${String(자리)}`);
  await 봇시키기(admin, 봇, 'ready');
  return 봇;
}

export async function 봇과함께던전입장(admin: APIRequestContext, game: GameDriver, 봇아이디: string, 봇비밀번호: string, 내직업: 직업 = '탱커') {
  const 봇 = await 봇두기(admin, 봇아이디, 봇비밀번호, 2);
  const 던전 = await 던전입장(game, 내직업);
  return { 봇, 던전 };
}

export interface 임프잡는쪽 {
  임프공격(): Promise<void>;
  임프있나(): Promise<boolean>;
  임프사라질때까지(한도ms?: number): Promise<boolean>;
}

export interface 색값 {
  r: number;
  g: number;
  b: number;
}

export function 색풀기(값: unknown): 색값 {
  const 숫자들 = (글: string): number[] => (글.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let 칸: number[] = [];
  if (typeof 값 === 'string') {
    칸 = 값.startsWith('#') ? [1, 3, 5].map((i) => parseInt(값.slice(i, i + 2), 16) / 255) : 숫자들(값);
  } else if (Array.isArray(값)) {
    칸 = 값.map(Number);
  } else if (typeof 값 === 'object' && 값 !== null) {
    const o = 값 as Record<string, unknown>;
    칸 = [Number(o['r']), Number(o['g']), Number(o['b'])];
  }
  if (칸.length < 3 || 칸.some((n) => Number.isNaN(n))) throw new Error(`색 값을 못 풀었습니다: ${JSON.stringify(값)}`);
  const 크기 = Math.max(...칸.slice(0, 3)) > 1 ? 255 : 1;
  return { r: 칸[0]! / 크기, g: 칸[1]! / 크기, b: 칸[2]! / 크기 };
}

export async function 글색읽기(game: GameDriver, 주소: string): Promise<색값> {
  return 색풀기(await game.get(주소, 'TextMeshProUGUI.color'));
}

export const 흰색인가 = (c: 색값): boolean => c.r > 0.85 && c.g > 0.85 && c.b > 0.85;
export const 빨강인가 = (c: 색값): boolean => c.r > 0.7 && c.g < 0.45 && c.b < 0.45;
export const 초록인가 = (c: 색값): boolean => c.g > 0.6 && c.r < 0.55 && c.b < 0.55;

export interface 표스킬 {
  이름: string;
  값: number;
  사거리: number;
  재사용: number;
}

export interface 표줄 {
  이름: string;
  영문: string;
  체력: number | null;
  스킬: 표스킬[];
}

export function 표줄읽기(줄: string): 표줄 {
  const [머리 = '', 꼬리 = ''] = 줄.split(' 스킬=');
  const 머리값 = /^(.*?)(?:\((\w+)\))?(?: 체력=(\d+))?$/.exec(머리.trim());
  const 스킬 = 꼬리
    .split(/,(?=[^,]*\(값|-)/)
    .map((마디) => /^(.+?)\(값 (-?[\d.]+) · 사거리 ([\d.]+) · 재사용 ([\d.]+)초\)$/.exec(마디.trim()))
    .filter((맞음): 맞음 is RegExpExecArray => 맞음 !== null)
    .map((맞음) => ({ 이름: 맞음[1]!, 값: Number(맞음[2]), 사거리: Number(맞음[3]), 재사용: Number(맞음[4]) }));
  if (머리값 === null) throw new Error(`표 줄을 못 읽었습니다: ${줄}`);
  return { 이름: 머리값[1]!, 영문: 머리값[2] ?? '', 체력: 머리값[3] === undefined ? null : Number(머리값[3]), 스킬 };
}

export async function 표읽기(game: GameDriver, 종류: 'skill' | 'monster'): Promise<Record<string, 표줄>> {
  const 줄들 = (await GM데이터(game, 종류)).filter((줄) => 줄.includes(' 스킬=')).map(표줄읽기);
  return Object.fromEntries(줄들.map((줄) => [줄.이름, 줄]));
}

export function 데이터표줄찾기(표: Record<string, 표줄>, 이름: string): 표줄 {
  const 줄 = 표[이름];
  if (줄 === undefined) throw new Error(`데이터 표에 「${이름}」 줄이 없습니다 — 받은 줄: ${Object.keys(표).join(', ')}`);
  return 줄;
}

export function 데이터표스킬찾기(표: Record<string, 표줄>, 이름: string): 표스킬 {
  const 찾음 = Object.values(표)
    .flatMap((줄) => 줄.스킬)
    .find((스킬) => 스킬.이름 === 이름);
  if (찾음 === undefined) throw new Error(`스킬 표에 「${이름}」 줄이 없습니다`);
  return 찾음;
}

export const 레벨업글금색인가 = (c: 색값): boolean => c.r > 0.8 && c.g > 0.6 && c.g < 0.95 && c.b < 0.45;

const 가방줄뿌리 = '/Showcase HUD/Window 가방/Panel 가방/Scroll/Content';

export async function 가방줄찾기(game: GameDriver, 이름: string, 한도ms = 10_000): Promise<string> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    for (let i = 0; i < 12; i += 1) {
      const 글주소 = `${가방줄뿌리}/Row[${String(i)}]/Label[0]/Text`;
      if ((await game.find(글주소)) === null) break;
      if ((await game.text(글주소)).includes(이름)) return `${가방줄뿌리}/Row[${String(i)}]`;
    }
    if (Date.now() > 끝) throw new Error(`가방에서 「${이름}」 줄을 못 찾았습니다`);
  }
}

export async function 가방에서끼기(game: GameDriver, 상점줄: number, 이름: string, 칸: '무기' | '갑옷'): Promise<string> {
  const 로비 = await 로비화면.열림(game, 15_000);
  await 로비.hud.메뉴누르기('상점');
  await game.click(`/Showcase HUD/Window 상점/Panel 상점/Scroll/Content/Row[${String(상점줄)}]/Button 구매`);
  await game.click('/Showcase HUD/Window 상점/Panel 상점/Button 닫기');
  await game.waitFor('/Showcase HUD/Window 상점', { gone: true, timeoutMs: 10_000 });
  await 로비.hud.메뉴누르기('가방');
  const 줄 = await 가방줄찾기(game, 이름);
  await game.click(`${줄}/Button 장착`);
  const 칸글주소 = `/Showcase HUD/Window 가방/Panel 가방/Gear/${칸}/Label[1]/Text`;
  await game.waitFor(칸글주소, { text: 이름, timeoutMs: 10_000 });
  const 글 = await game.text(칸글주소);
  await game.click('/Showcase HUD/Window 가방/Panel 가방/Button 닫기');
  await game.waitFor('/Showcase HUD/Window 가방', { gone: true, timeoutMs: 10_000 });
  return 글;
}

export async function 로비불러오는글잡기(game: GameDriver, 화면주소: string, 글주소: string, 끝낼주소: string, 한도ms: number): Promise<string | null> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    if (Number(await game.get(화면주소, 'CanvasGroup.alpha')) > 0.5) return game.text(글주소);
    if ((await game.find(끝낼주소)) !== null || Date.now() > 끝) return null;
  }
}

export function 로비HUD금색레벨인가(글: string): boolean {
  const 맞음 = /<color=(#[0-9A-Fa-f]{6})>Lv\./.exec(글);
  if (맞음 === null) return false;
  const c = 색풀기(맞음[1]);
  return c.r > 0.85 && c.g > 0.7 && c.b < 0.5;
}

const 상점뿌리 = '/Showcase HUD/Window 상점/Panel 상점';

export async function 창열기(game: GameDriver, 이름: '가방' | '상점'): Promise<void> {
  await (await 로비화면.열림(game, 15_000)).hud.메뉴누르기(이름);
  await game.waitFor(`/Showcase HUD/Window ${이름}`, { timeoutMs: 10_000 });
}

export async function 상점에서사기(game: GameDriver, 이름: string, 번 = 1, 간격초 = 0.2): Promise<void> {
  const 줄들 = `${상점뿌리}/Scroll/Content`;
  let 줄 = '';
  for (let i = 0; i < 9 && 줄 === ''; i += 1) {
    const 글 = `${줄들}/Row[${String(i)}]/Label[0]/Text`;
    if ((await game.find(글)) !== null && (await game.text(글)).includes(이름)) 줄 = `${줄들}/Row[${String(i)}]`;
  }
  if (줄 === '') throw new Error(`상점에서 「${이름}」 줄을 못 찾았습니다`);
  for (let 번째 = 0; 번째 < 4; 번째 += 1) {
    const 칸 = (await game.find(`${줄}/Button 구매`))?.rect;
    const 창 = (await game.find(`${상점뿌리}/Scroll`))?.rect;
    if (칸 !== undefined && 창 !== undefined && 칸[1] >= 창[1] && 칸[1] + 칸[3] <= 창[1] + 창[3]) break;
    await game.drag(`${줄들}/Row[3]`, `${줄들}/Row[0]`);
  }
  await game.click(`${줄}/Button 구매`, { count: 번, interval: 간격초 });
}

export async function 알림줄ID들(game: GameDriver): Promise<string[]> {
  const 모은: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const 칸 = await game.find(`/Showcase HUD/Toasts/Toast[${String(i)}]`);
    if (칸 === null) break;
    모은.push(칸.id ?? 칸.path);
  }
  return 모은;
}

export async function 알림줄ID기다리기(game: GameDriver, 맞나: (ID들: string[]) => boolean, 한도ms = 10_000): Promise<string[]> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 목록 = await 알림줄ID들(game);
    if (맞나(목록) || Date.now() > 끝) return 목록;
  }
}

export async function GM경험치바로(game: GameDriver, 경험치: number): Promise<void> {
  if ((await game.find('/Showcase HUD/Window 채팅')) === null) {
    await game.click('ChatStrip');
    await game.waitFor('Input 메시지 입력 (100자)', { timeoutMs: 10_000 });
  }
  await game.click('Button 전체');
  await game.type('Input 메시지 입력 (100자)', `/gm exp ${String(경험치)}`);
  await game.click('Button 보내기');
}

export async function 큰글주소(game: GameDriver, 글: string, 한도ms = 10_000): Promise<string | null> {
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

export async function 큰글기다리기(game: GameDriver, 글: string, 보임: boolean, 한도ms = 10_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 보인다 = (await 큰글주소(game, 글, 0)) !== null;
    if (보인다 === 보임) return true;
    if (Date.now() > 끝) return false;
  }
}

export async function 임프하나잡기(game: GameDriver, 던전: 임프잡는쪽): Promise<boolean> {
  await GM임프불러내기(game);
  return 불러둔임프잡기(던전);
}

export async function 스탯읽기(game: GameDriver): Promise<Record<string, string>> {
  await GM스탯(game);
  const 열려있었다 = await 채팅창.열려있나(game);
  const 창 = await 채팅창.열기(game);
  const 칸: Record<string, string> = {};
  for (const 줄 of (await 창.최근줄들(3)).reverse()) {
    const 몸 = 색글떼기(줄).split('[GM] stat ')[1];
    if (몸 === undefined) continue;
    for (const 마디 of 몸.split(/ (?=\S+=)/)) {
      const 자리 = 마디.indexOf('=');
      if (자리 > 0) 칸[마디.slice(0, 자리)] = 마디.slice(자리 + 1);
    }
  }
  if (!열려있었다) await 창.닫기();
  return 칸;
}

export async function 불러둔임프잡기(던전: 임프잡는쪽): Promise<boolean> {
  for (let 번 = 0; 번 < 8; 번 += 1) {
    try {
      await 던전.임프공격();
    } catch (e) {
      if (await 던전.임프있나()) throw e;
      return true;
    }
    if (await 던전.임프사라질때까지(2_000)) return true;
  }
  return false;
}

export const 그림들 = { 부활: 'ui_revive', 들기: 'ui_action_pickup', 내려놓기: 'ui_action_putdown' } as const;
