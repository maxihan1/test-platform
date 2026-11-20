import type { GameDriver } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';

import { 공통HUD, 색뗀글 } from '../components/hud.component.js';
import { 가방창 } from '../pages/bag.page.js';
import { 로비화면 } from '../pages/lobby.page.js';
import { 로그인화면 } from '../pages/login.page.js';
import { 안내창 } from '../pages/popup.page.js';
import { 퀘스트창 } from '../pages/quest.page.js';
import { 상점창 } from '../pages/shop.page.js';

import { 게임다시켜기, 안내창닫기, 지금화면, type 앱제어 } from './game-enter.helper.js';
import { GM상태, 봇모두끄기, 봇켜기, 손님봇켜기, 접속자, type 계정 } from './game-state.helper.js';

export async function 로그인화면준비(game: GameDriver, driver: 앱제어): Promise<로그인화면> {
  if ((await 지금화면(game)) !== '로그인') await 게임다시켜기(game, driver);
  await 안내창닫기(game);
  return 로그인화면.열기(game);
}

export async function 시작시도(화면: 로그인화면, 누구: 계정, 비밀번호 = 누구.비밀번호): Promise<void> {
  await 화면.아이디넣기(누구.아이디);
  await 화면.비밀번호넣기(비밀번호);
  await 화면.시작누르기();
}

export const 틀린비밀번호 = (누구: 계정): string => `${누구.비밀번호}_틀림`;

export const 없는아이디 = 'qa_nouser_zz';

export interface 자리값 {
  가로: '왼쪽' | '오른쪽';
  세로: '위' | '아래';
  가운데가로: boolean;
  가운데세로: boolean;
}

export async function 화면자리(game: GameDriver, 주소: string): Promise<자리값 | null> {
  const 찾음 = await game.find(주소);
  if (찾음?.rect === undefined || 찾음.screen === undefined) return null;
  const [x, y, w, h] = 찾음.rect;
  const [화면너비, 화면높이] = 찾음.screen;
  const 가로비 = (x + w / 2) / 화면너비;
  const 세로비 = 1 - (y + h / 2) / 화면높이;
  return {
    가로: 가로비 < 0.5 ? '왼쪽' : '오른쪽',
    세로: 세로비 < 0.5 ? '위' : '아래',
    가운데가로: 가로비 > 0.33 && 가로비 < 0.67,
    가운데세로: 세로비 > 0.33 && 세로비 < 0.67,
  };
}

export interface 색값 {
  r: number;
  g: number;
  b: number;
  a: number;
}

function 색풀기(값: unknown): 색값 | null {
  if (값 === null || 값 === undefined) return null;
  const 숫자들 =
    typeof 값 === 'string'
      ? (값.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      : Array.isArray(값)
        ? (값 as unknown[]).map(Number)
        : typeof 값 === 'object'
          ? ['r', 'g', 'b', 'a'].map((키) => Number((값 as Record<string, unknown>)[키] ?? 1))
          : [];
  if (숫자들.length < 3 || 숫자들.some((n) => Number.isNaN(n))) return null;
  const 크다 = 숫자들.slice(0, 3).some((n) => n > 1);
  const 나눔 = 크다 ? 255 : 1;
  return { r: (숫자들[0] ?? 0) / 나눔, g: (숫자들[1] ?? 0) / 나눔, b: (숫자들[2] ?? 0) / 나눔, a: 숫자들[3] === undefined ? 1 : 숫자들[3] / (크다 && 숫자들[3] > 1 ? 255 : 1) };
}

function 색코드풀기(코드: string): 색값 | null {
  const 맞음 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})?$/.exec(코드);
  if (맞음 === null) return null;
  return { r: parseInt(맞음[1] ?? '0', 16) / 255, g: parseInt(맞음[2] ?? '0', 16) / 255, b: parseInt(맞음[3] ?? '0', 16) / 255, a: 맞음[4] === undefined ? 1 : parseInt(맞음[4], 16) / 255 };
}

export async function 글자색(game: GameDriver, 주소: string): Promise<색값 | null> {
  const 찾음 = await game.find(주소);
  const 태그 = /<color=(#[0-9a-fA-F]{6,8})>/.exec(찾음?.text ?? '');
  if (태그 !== null) return 색코드풀기(태그[1] ?? '');
  return 색풀기(await game.get(주소, 'Text.color'));
}

export async function 그림색(game: GameDriver, 주소: string): Promise<색값 | null> {
  return 색풀기(await game.get(주소, 'Image.color'));
}

export const 빨강인가 = (c: 색값 | null): boolean => c !== null && c.r > 0.6 && c.g < 0.45 && c.b < 0.45;

export const 어두운빨강인가 = (c: 색값 | null): boolean => c !== null && c.r > 0.2 && c.r < 0.7 && c.g < 0.25 && c.b < 0.25 && c.r > 2 * Math.max(c.g, c.b);

export const 연분홍인가 = (c: 색값 | null): boolean => c !== null && c.r > 0.8 && c.g > 0.55 && c.g < 0.9 && c.b > 0.55 && c.b < 0.95 && c.r > c.g;

export const 회색인가 = (c: 색값 | null): boolean => c !== null && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.12 && c.r > 0.3 && c.r < 0.85;

export const 금색인가 = (c: 색값 | null): boolean => c !== null && c.r > 0.8 && c.g > 0.65 && c.g < 0.92 && c.b < 0.55;

export const 반투명검정인가 = (c: 색값 | null): boolean => c !== null && c.r < 0.15 && c.g < 0.15 && c.b < 0.15 && c.a > 0.1 && c.a < 0.95;

const 로비접속인원줄 = '/CharacterSelectCanvas/NumPlayersBox/Text (TMP)';

const 로비제목줄 = '/CharacterSelectCanvas/Title Text bg/TitleText (TMP)';

export async function 로비접속인원글(game: GameDriver): Promise<string> {
  return 색뗀글(await game.text(로비접속인원줄));
}

export async function 로비접속인원글이될때까지(game: GameDriver, 글: string, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    const 지금 = await 로비접속인원글(game).then(
      (값) => 값,
      () => '',
    );
    if (지금 === 글) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 상단바글칸수(game: GameDriver): Promise<number> {
  let 수 = 0;
  while (수 < 10 && (await game.find(`/Showcase HUD/PlayerBar/Label[${String(수)}]`)) !== null) 수 += 1;
  return 수;
}

export async function 로비제목글(game: GameDriver): Promise<string> {
  return 색뗀글(await game.text(로비제목줄));
}

export async function 로비제목자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 로비제목줄);
}

export async function 로비복귀됨(game: GameDriver, 한도ms = 120_000): Promise<boolean> {
  return game.waitForValue(로비화면.준비버튼, 'Button.interactable', true, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 영웅카드수(game: GameDriver): Promise<number> {
  let 수 = 0;
  while (수 < 20 && (await game.find(로비화면.자리(수))) !== null) 수 += 1;
  return 수;
}

export async function 영웅카드자리(game: GameDriver, 번호: number): Promise<자리값 | null> {
  return 화면자리(game, 로비화면.자리(번호));
}

export async function 영웅카드직업이름들(game: GameDriver): Promise<string[]> {
  const 화면 = new 로비화면(game);
  const 수 = await 영웅카드수(game);
  const 이름들: string[] = [];
  for (let 번호 = 0; 번호 < 수; 번호 += 1) {
    await 화면.자리누르기(번호);
    await game.waitFor(`${로비화면.자리(번호)}/AnimationContainer/Outline (when selected)`, { timeoutMs: 5_000 });
    await game.waitFor(로비화면.현재직업줄, { timeoutMs: 5_000 });
    이름들.push(await 화면.현재직업());
  }
  return 이름들;
}

export function 직업별기본체력(줄들: string[], 직업: string): number | null {
  const 줄 = 줄들.find((글) => 글.includes(직업));
  if (줄 === undefined) return null;
  const 맞음 = /(?:체력|hp|HP)\D*?(\d[\d,]*)/.exec(줄);
  return 맞음 === null ? null : Number((맞음[1] ?? '').replace(/,/g, ''));
}

export function 최대체력읽기(체력글: string | undefined): number | null {
  if (체력글 === undefined) return null;
  const 끝 = 체력글.split('/').at(-1) ?? '';
  const 숫자 = Number(끝.replace(/[^0-9]/g, ''));
  return Number.isNaN(숫자) || 끝.replace(/[^0-9]/g, '') === '' ? null : 숫자;
}

export async function 퀘스트진행수(game: GameDriver, 퀘스트이름: string): Promise<number | null> {
  const 창 = await 퀘스트창.열기(game);
  const 번호 = await 창.줄찾기(퀘스트이름);
  const 글 = 번호 === null ? null : await 창.줄진행(번호);
  await 창.닫기();
  const 맞음 = 글 === null ? null : /(\d+)\s*\/\s*\d+/.exec(글);
  return 맞음 === null ? null : Number(맞음[1]);
}

export async function 퀘스트진행이오를때까지(game: GameDriver, 퀘스트이름: string, 기준: number, 한도ms = 15_000): Promise<number | null> {
  const 끝 = Date.now() + 한도ms;
  let 값: number | null = null;
  do {
    값 = await 퀘스트진행수(game, 퀘스트이름);
    if (값 !== null && 값 > 기준) return 값;
  } while (Date.now() < 끝);
  return 값;
}

export async function 던전이름표글들(game: GameDriver): Promise<string[]> {
  const 글들: string[] = [];
  for (let 번호 = 0; 번호 < 60; 번호 += 1) {
    const 표 = `/BossRoomHudCanvas/UIStateDisplay(Clone)[${String(번호)}]`;
    if ((await game.find(표)) === null) break;
    const 이름 = await game.find(`${표}/UIName/Text (TMP)`);
    if (이름 !== null) 글들.push(색뗀글(이름.text ?? ''));
  }
  return 글들;
}

export async function 설정창닫기(game: GameDriver): Promise<void> {
  if ((await game.find(로그인화면.설정창)) === null) return;
  await game.click(로그인화면.설정버튼);
  await game.waitFor(로그인화면.설정창, { gone: true, timeoutMs: 5_000 });
}

export async function 로그인상태줄글자색(game: GameDriver): Promise<색값 | null> {
  return 글자색(game, 로그인화면.상태줄);
}

export async function 로그인상태줄이시작버튼아래인가(game: GameDriver): Promise<boolean> {
  const 줄 = await game.find(로그인화면.상태줄);
  const 버튼 = await game.find(로그인화면.시작버튼);
  if (줄?.rect === undefined || 버튼?.rect === undefined) return false;
  return 줄.rect[1] + 줄.rect[3] / 2 < 버튼.rect[1] + 버튼.rect[3] / 2;
}

export interface 안내창글 {
  제목: string;
  본문: string;
  본문원문: string;
}

export async function 안내창읽기(game: GameDriver, 한도ms = 30_000): Promise<안내창글 | null> {
  const 창 = await 안내창.뜰때까지(game, 한도ms);
  if (창 === null) return null;
  return { 제목: await 창.제목(), 본문: await 창.본문(), 본문원문: await 창.본문원문() };
}

export async function 상태줄이비길때까지(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
  return game.waitForValue(로그인화면.상태줄, 'Text.text', '', { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 로그인창있나(game: GameDriver): Promise<boolean> {
  return (await game.find(로그인화면.판)) !== null;
}

export async function 칸에서키치기(game: GameDriver, 칸주소: string, 키: string): Promise<void> {
  await game.click(칸주소);
  await game.key(키);
}

export async function 칸골라질때까지(game: GameDriver, 칸주소: string, 한도ms = 10_000): Promise<boolean> {
  return game.waitForValue(칸주소, 'TMP_InputField.isFocused', true, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export function UTC시분글(시각: Date): string {
  return `${String(시각.getUTCHours()).padStart(2, '0')}:${String(시각.getUTCMinutes()).padStart(2, '0')}`;
}

export function 분뒤정각(분: number): Date {
  return new Date(Math.ceil((Date.now() + 분 * 60_000) / 60_000) * 60_000);
}

export async function 손님봇채우기(admin: APIRequestContext, 목표: number): Promise<void> {
  const 지금 = (await 접속자(admin)).bots.length;
  const 이름들 = Array.from({ length: Math.max(0, 목표 - 지금) }, (_, 번호) => `qaguest${String(지금 + 번호 + 1)}`);
  await Promise.all(이름들.map((이름) => 손님봇켜기(admin, 이름)));
}

const 운영주소 = 'https://bossroom-api.maxihan.com/opsapi';

export async function 캐릭터없음(admin: APIRequestContext, 이름: string): Promise<boolean> {
  const 응답 = await admin.fetch(`${운영주소}/characters?q=${encodeURIComponent(이름)}`, { method: 'GET' });
  if (!응답.ok()) throw new Error(`캐릭터 ${이름} 조회 실패: ${String(응답.status())} ${(await 응답.text()).slice(0, 300)}`);
  const 값 = (await 응답.json()) as { name?: string }[];
  return 값.length === 0 || 값.every((줄) => 줄.name !== undefined && 줄.name !== 이름);
}

export async function 걸린실패소진(admin: APIRequestContext, 누구: 계정): Promise<void> {
  try {
    await 봇켜기(admin, 누구);
  } finally {
    await 봇모두끄기(admin);
  }
}

export async function 저장끝날때까지(game: GameDriver, 한도ms = 30_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await GM상태(game))['저장대기'] === '아니오') return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 시도글읽기(game: GameDriver): Promise<string | null> {
  const 줄 = await game.find(`${안내창.창}//*[contains(@text,시도)][0]`);
  return 줄 === null ? null : 색뗀글(줄.text ?? '');
}

export async function 시도글모으기(game: GameDriver, 끝글: string, 한도ms: number): Promise<string[]> {
  const 나온글: string[] = [];
  const 끝 = Date.now() + 한도ms;
  const 창 = new 안내창(game);
  do {
    const 글 = await 시도글읽기(game);
    for (const 맞음 of (글 ?? '').matchAll(/시도\s*\d+\s*\/\s*\d+/g)) {
      const 정리 = 맞음[0].replace(/\s*\/\s*/, '/');
      if (!나온글.includes(정리)) 나온글.push(정리);
    }
    if (await 창.본문에줄있나(끝글)) break;
  } while (Date.now() < 끝);
  return 나온글;
}

export async function 안내창에글뜸(game: GameDriver, 글: string, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor(`${안내창.창}//*[contains(@text,${글})][-1]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 가방줄이될때까지(game: GameDriver, 번호: number, 글: string, 한도ms = 15_000): Promise<boolean> {
  return game.waitFor(`${가방창.줄주소(번호)}/Label[0]/Text`, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 메뉴글이될때까지(game: GameDriver, 이름: '가방' | '상점' | '퀘스트' | '우편' | '친구' | '길드', 글: string, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor(`${공통HUD.메뉴버튼(이름)}/Text`, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 화면에글있나(game: GameDriver, 글: string): Promise<boolean> {
  return (await game.find(`//*[contains(@text,${글})][0]`)) !== null;
}

export async function 글이뜰때까지(game: GameDriver, 글: string, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor(`//*[contains(@text,${글})][-1]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function HUD이름뜰때까지(game: GameDriver, 글: string, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor(공통HUD.레벨줄, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export const 레벨표시인가 = (글: string, 레벨: number): boolean => new RegExp(`^Lv\\.\\s*${String(레벨)}(?!\\d)`).test(글);

const 허드공지띠 = '/Showcase HUD/NoticeBar';

const 로그인공지띠 = '/Showcase Login/*[contains(@text,공지)][-1]';

export async function 저장대기가풀릴때까지(game: GameDriver, 한도ms: number): Promise<string> {
  const 끝 = Date.now() + 한도ms;
  let 값 = '';
  do {
    값 = (await GM상태(game))['저장대기'] ?? '';
    if (값 === '아니오') return 값;
  } while (Date.now() < 끝);
  return 값;
}

export async function 허드공지띠글(game: GameDriver): Promise<string | null> {
  const 띠 = await game.find(허드공지띠);
  if (띠 === null) return null;
  if ((띠.text ?? '') !== '') return 색뗀글(띠.text ?? '');
  const 자손 = await game.find(`${허드공지띠}//*[contains(@text,공지)][-1]`);
  return 자손 === null ? '' : 색뗀글(자손.text ?? '');
}

export async function 허드공지띠가보이나(game: GameDriver): Promise<boolean> {
  const 글 = await 허드공지띠글(game);
  return 글 !== null && 글 !== '';
}

export async function 허드공지띠가될때까지(game: GameDriver, 글: string, 한도ms = 30_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if (((await 허드공지띠글(game)) ?? '').includes(글)) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 허드공지띠자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 허드공지띠);
}

export async function 로그인공지띠에글이뜰때까지(game: GameDriver, 조각: string, 한도ms = 15_000): Promise<boolean> {
  return game.waitFor(`/Showcase Login/*[contains(@text,${조각})][-1]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 로그인공지띠에글이남는가(game: GameDriver, 조각: string, 한도ms: number): Promise<boolean> {
  return game.waitFor(`/Showcase Login/*[contains(@text,${조각})][-1]`, { gone: true, timeoutMs: 한도ms }).then(
    () => false,
    () => true,
  );
}

async function 글칸수치(game: GameDriver, 주소: string, 칸: string): Promise<number> {
  let 값: unknown;
  try {
    값 = await game.get(주소, `Text.${칸}`);
  } catch (첫오류) {
    try {
      값 = await game.get(주소, `TextMeshProUGUI.${칸}`);
    } catch (둘째오류) {
      throw new Error(`공지 띠 글 칸 ${칸} 을 읽지 못했습니다 — Text: ${String(첫오류)} · TextMeshProUGUI: ${String(둘째오류)}`);
    }
  }
  const 수 = Number(값);
  if (!Number.isFinite(수)) throw new Error(`공지 띠 글 칸 ${칸} 이 숫자가 아닙니다: ${JSON.stringify(값)}`);
  return 수;
}

export async function 공지띠줄수(game: GameDriver): Promise<number> {
  const 높이 = await 글칸수치(game, 로그인공지띠, 'preferredHeight');
  const 크기 = await 글칸수치(game, 로그인공지띠, 'fontSize');
  return Math.round(높이 / (크기 * 1.2));
}

export async function 무기칸이될때까지(game: GameDriver, 글: string, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`${가방창.칸('무기')}/Label[1]/Text`, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

type 창이름 = (typeof 공통HUD.창이름들)[number];

const 토스트주소 = '/Showcase HUD/Toasts/Toast';

export async function 열린창목록(game: GameDriver): Promise<string[]> {
  const 열림: string[] = [];
  for (const 이름 of 공통HUD.창이름들) {
    if ((await game.find(`/Showcase HUD/Window ${이름}`)) !== null) 열림.push(이름);
  }
  return 열림;
}

export async function 창이열릴때까지(game: GameDriver, 이름: 창이름, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`/Showcase HUD/Window ${이름}/Panel ${이름}`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 토스트수(game: GameDriver): Promise<number> {
  let 수 = 0;
  while (수 < 12 && (await game.find(`${토스트주소}[${String(수)}]`)) !== null) 수 += 1;
  if (수 === 0 && (await game.find(토스트주소)) !== null) return 1;
  return 수;
}

export async function 토스트글들(game: GameDriver): Promise<string[]> {
  const 글들: string[] = [];
  const 개수 = await 토스트수(game);
  for (let 번 = 0; 번 < 개수; 번 += 1) {
    const 찾음 = await game.find(`${토스트주소}[${String(번)}]/Text`);
    if (찾음 !== null) 글들.push(찾음.text ?? '');
  }
  return 글들;
}

export async function 토스트뜰때까지(game: GameDriver, 한도ms = 10_000): Promise<boolean> {
  return game.waitFor(`${토스트주소}[-1]`, { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 토스트모두사라질때까지(game: GameDriver, 한도ms = 15_000): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await 토스트수(game)) === 0) return true;
  } while (Date.now() < 끝);
  return false;
}

export async function 토스트자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, `${토스트주소}[-1]`);
}

export async function 토스트바탕색(game: GameDriver): Promise<색값 | null> {
  return 그림색(game, `${토스트주소}[-1]`);
}

export async function 토스트글자색(game: GameDriver): Promise<색값 | null> {
  return 글자색(game, `${토스트주소}[-1]/Text`);
}

async function 보이기까지의수명재기(game: GameDriver, 주소: string, 한도ms: number): Promise<{ 뜸: boolean; 초: number }> {
  const 끝 = Date.now() + 한도ms;
  let 시작 = 0;
  while (Date.now() < 끝) {
    const 있다 = (await game.find(주소)) !== null;
    if (시작 === 0 && 있다) 시작 = Date.now();
    else if (시작 !== 0 && !있다) return { 뜸: true, 초: (Date.now() - 시작) / 1000 };
  }
  return { 뜸: 시작 !== 0, 초: 시작 === 0 ? 0 : (Date.now() - 시작) / 1000 };
}

export async function 토스트수명재기(game: GameDriver, 한도ms = 20_000): Promise<{ 뜸: boolean; 초: number }> {
  return 보이기까지의수명재기(game, `${토스트주소}[-1]`, 한도ms);
}

export async function 큰알림수명재기(game: GameDriver, 글: string, 한도ms = 30_000): Promise<{ 뜸: boolean; 초: number }> {
  return 보이기까지의수명재기(game, 공통HUD.큰알림(글), 한도ms);
}

export async function 골드숫자가될때까지(game: GameDriver, 값: number, 한도ms = 15_000): Promise<boolean> {
  const hud = new 공통HUD(game);
  const 끝 = Date.now() + 한도ms;
  do {
    if ((await hud.골드값()) === 값) return true;
  } while (Date.now() < 끝);
  return false;
}

async function 줄버튼이보이나(game: GameDriver, 줄번호: number): Promise<boolean> {
  const 버튼 = await game.find(`${상점창.줄주소(줄번호)}/Button 구매`);
  const 칸 = await game.find(`${상점창.판}/Scroll`);
  if (버튼?.rect === undefined || 칸?.rect === undefined) return false;
  const [, 버튼아래, , 버튼높이] = 버튼.rect;
  const [, 칸아래, , 칸높이] = 칸.rect;
  return 버튼아래 >= 칸아래 && 버튼아래 + 버튼높이 <= 칸아래 + 칸높이;
}

async function 보이는끝줄(game: GameDriver, 상점: 상점창): Promise<number> {
  const 수 = await 상점.줄수();
  let 끝 = -1;
  for (let 번 = 0; 번 < 수; 번 += 1) {
    if (await 줄버튼이보이나(game, 번)) 끝 = 번;
  }
  return 끝;
}

export async function 상점줄구매(game: GameDriver, 상점: 상점창, 글: string, 횟수 = 1): Promise<void> {
  const 줄 = await 상점.줄찾기(글);
  if (줄 === null) throw new Error(`상점에 「${글}」 줄이 없습니다`);
  for (let 번 = 0; 번 < 8 && !(await 줄버튼이보이나(game, 줄)); 번 += 1) {
    const 끝 = await 보이는끝줄(game, 상점);
    if (끝 < 0) throw new Error('상점 창에 보이는 줄이 없습니다');
    await 상점.끌어서넘기기(끝, Math.max(끝 - 2, 0));
  }
  if (!(await 줄버튼이보이나(game, 줄))) throw new Error(`상점의 「${글}」 구매 버튼을 화면 안으로 끌어 올리지 못했습니다`);
  await game.click(`${상점창.줄주소(줄)}/Button 구매`, { count: 횟수, interval: 0.2 });
}

export async function 로그인버전글자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, '//Showcase Login/*[contains(@text,v0.1)]');
}

export async function 톱니바퀴자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 로그인화면.설정버튼);
}

export async function X버튼자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 로그인화면.끄기버튼);
}

export const 오른쪽위인가 = (자리: 자리값 | null): boolean => 자리 !== null && 자리.가로 === '오른쪽' && 자리.세로 === '위';

export async function 상단바뜸(game: GameDriver, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor('/Showcase HUD/PlayerBar', { timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 상단바사라질때까지(game: GameDriver, 한도ms = 30_000): Promise<boolean> {
  return game.waitFor('/Showcase HUD/PlayerBar', { gone: true, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 경험치막대있나(game: GameDriver): Promise<boolean> {
  return (await game.find(공통HUD.경험치막대)) !== null;
}

const 메뉴이름들 = ['가방', '상점', '퀘스트', '우편', '친구', '길드'] as const;

export async function 메뉴버튼차례(game: GameDriver): Promise<string> {
  const 줄: { 글: string; 위: number }[] = [];
  for (const 이름 of 메뉴이름들) {
    const 찾음 = await game.find(공통HUD.메뉴버튼(이름));
    if (찾음?.rect === undefined) return `${이름} 버튼 자리를 못 읽음`;
    줄.push({ 글: 색뗀글(await game.text(`${공통HUD.메뉴버튼(이름)}/Text`)), 위: 찾음.rect[1] + 찾음.rect[3] / 2 });
  }
  return 줄
    .sort((가, 나) => 나.위 - 가.위)
    .map((x) => x.글)
    .join(' · ');
}

export async function 메뉴자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 공통HUD.메뉴);
}

export async function 메뉴가세로줄인가(game: GameDriver): Promise<boolean> {
  const 중심: { x: number; y: number; 너비: number }[] = [];
  for (const 이름 of 메뉴이름들) {
    const 찾음 = await game.find(공통HUD.메뉴버튼(이름));
    if (찾음?.rect === undefined) return false;
    중심.push({ x: 찾음.rect[0] + 찾음.rect[2] / 2, y: 찾음.rect[1] + 찾음.rect[3] / 2, 너비: 찾음.rect[2] });
  }
  const 너비 = Math.min(...중심.map((c) => c.너비));
  const 가로퍼짐 = Math.max(...중심.map((c) => c.x)) - Math.min(...중심.map((c) => c.x));
  const 세로로 = 중심.map((c) => c.y).sort((가, 나) => 가 - 나);
  const 겹침 = 세로로.some((값, 번호) => 번호 > 0 && 값 - (세로로[번호 - 1] ?? 값) < 1);
  return 가로퍼짐 < 너비 / 2 && !겹침;
}

export async function 채팅띠자리(game: GameDriver): Promise<자리값 | null> {
  return 화면자리(game, 공통HUD.채팅띠);
}

export async function 채팅띠에글뜰때까지(game: GameDriver, 글: string, 한도ms = 15_000): Promise<boolean> {
  return game.waitFor(공통HUD.채팅띠글, { text: 글, timeoutMs: 한도ms }).then(
    () => true,
    () => false,
  );
}

export async function 채팅띠줄들(game: GameDriver): Promise<string[]> {
  const 글 = 색뗀글(await game.text(공통HUD.채팅띠글));
  return 글
    .split('\n')
    .map((줄) => 줄.trim())
    .filter((줄) => 줄 !== '');
}
