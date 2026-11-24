// 돌려 보기 폰 갈래가 케이스에 넘기는 환경값 — 갈 서버 · 폰 · 돌발 팝업 · PC 게임 이름 · 패드, 그리고 PC 게임 케이스를 윈도우 값마다 나누는 규칙 (도메인/게임 §3.10 「작성 — PC 게임은 PC 에서 읽고 돌려 본다」)

import { PC_PLATFORMS, PC항목인가 } from '@platform/kit/types';

import type { 돌린판 } from './authoring-gate3.js';
import { type 맵행, 맵행읽기 } from './authoring-game-route.js';
import { 판정하기, 한판들 } from './authoring-phone-split.js';
import { type 판정줄, 프로시저케이스들, 프로시저판정 } from './authoring-proc-run.js';

/** 폰에서 도는 두 갈래 — 게임은 control-cli, 앱은 appium-cli 로 AI 가 폰을 잡는다 */
export type 폰갈래 = '게임' | '앱';

/**
 * 폰 케이스가 갈 서버 — 게임은 어드민 키가 있으면 에이전트가 그 줄 주소를 `PLATFORM_BASE_URL` 로 넘겼다. 없으면 `PLATFORM_ACCOUNTS` 맨 앞(앱 줄 — 작성.md §3.6 「★ 역할별 계정」)의 주소.
 * 앱은 에이전트가 주소를 안 넘겨 `PLATFORM_BASE_URL` 이 AI 가 고른 것이다 — 프롬프트 서버 목록에는 어느 줄이 앱 줄인지 없어서 계정 맨 앞을 먼저 본다(`계정먼저`).
 * 둘 다 없으면 null — AI 가 주소를 고르면 키 · 계정과 다른 서버로 갈 수 있다
 */
export function 앱줄주소(env: NodeJS.ProcessEnv, 계정먼저 = false): string | null {
  let 첫줄: unknown;
  try {
    첫줄 = (JSON.parse(env.PLATFORM_ACCOUNTS || '[]') as { baseUrl?: unknown }[])[0]?.baseUrl;
  } catch {
    첫줄 = undefined;
  }
  const 계정줄 = typeof 첫줄 === 'string' && 첫줄 !== '' ? 첫줄 : null;
  return (계정먼저 ? (계정줄 ?? env.PLATFORM_BASE_URL) : (env.PLATFORM_BASE_URL || 계정줄)) || null;
}

/** kit 이 팜 폰에 붙는 환경값 — 정식 실행의 러너(execute.ts gameEnv)와 같다. 앱도 셋 다 적는다 — 셸의 게임 값을 물려받으면 kit 이 게임 설정으로 붙는다 */
export const 게임환경 = (폰: string): Record<string, string> => ({ PLATFORM_ENGINE: 'GAME', PLATFORM_GAME_LINK: 'farm', PLATFORM_DEVICE_UDID: 폰 });
export const 폰환경 = (갈래: 폰갈래, 폰: string): Record<string, string> => (갈래 === '게임' ? 게임환경(폰) : { PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_DEVICE_UDID: 폰 });

/** 맵의 「확인」 돌발 팝업 행을 실행 요청 꼴로 — 창 열쇠의 장면 머리를 떼고(서버 돌발팝업들과 같다) 제어 문자 · 200자 넘는 행은 빼고 100개까지 (GAME-F5-03 · 05) */
const 차례 = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function 맵돌발팝업(행들: readonly 맵행[]): { window: string; close: string }[] {
  const 실을주소 = (v: string): boolean => v.length <= 200 && ![...v].some((c) => c < ' ');
  return 행들
    .filter((r) => r.kind === 'POPUP' && r.status === 'OK')
    // 서버처럼 열쇠 · 닫는 주소 차례로 — 100개를 넘을 때 같은 것이 빠진다(서버는 C 차례 — 글자 값 차례와 같다)
    .sort((a, b) => 차례(a.from, b.from) || 차례(a.action, b.action))
    .map((r) => ({ window: /^game:[^/]*(\/.+)$/.exec(r.from)?.[1] ?? r.from, close: r.action }))
    .filter((p) => 실을주소(p.window) && 실을주소(p.close))
    .slice(0, 100);
}

/**
 * 작성 돌려 보기에 넘길 돌발 팝업(PLATFORM_GAME_POPUPS) — 정식 실행처럼 kit 이 막힌 동작에서 닫게 한다. 자료 폴더의 조작 맵 글과 이번 작성이 적은 행의 「확인」 팝업.
 * 없으면 빈 값 — 앱 갈래도 빈 값을 넘겨 셸의 게임 값을 덮는다 (도메인/게임 §3.10 「돌발 팝업 자동 닫기」 · GAME-F5-05)
 */
export function 돌발팝업값(자료: string | undefined): string {
  const 들 = 자료 ? 맵돌발팝업(맵행읽기(자료)?.행들 ?? []) : [];
  return 들.length === 0 ? '' : JSON.stringify(들);
}

/** PC 게임은 kit 이 VISION 에 게임을 켜고 패드를 정한다 — 정식 실행의 러너(itemEnv gameEnv)와 같은 값 */
export const PC환경 = (값: string, 게임: string): Record<string, string> => ({ PLATFORM_PC_GAME: 게임, PLATFORM_PAD: 값 === 'windows' ? '' : 값.slice('windows-'.length) });

/** PC 게임 케이스가 선언한 윈도우 값 — 값마다 Playwright 프로젝트 하나로 따로 돈다(패드는 항목마다 PLATFORM_PAD 하나라서) */
export function 윈도우값들(글: string): string[] {
  const 칸 = /platforms:\s*\[([^\]]*)\]/.exec(글)?.[1] ?? '';
  return [...칸.matchAll(/['"`]([\w-]+)['"`]/g)].map((m) => m[1]!).filter(PC항목인가);
}

/**
 * 묶음 하나를 돌릴 차례 — 폰은 android 한 번, PC 는 선언한 윈도우 값마다 한 번이다.
 * PC 의 패드는 기록 이름의 PC 번호 꼬리(`pc-pc1:ps5`)로 갈라 판정에서 다른 「폰」으로 읽힌다 — 같은 파일의 PS5 빨강이 Xbox 초록에 덮이지 않게
 */
export function 차례짜기(pc: boolean, 파일들: readonly string[], 글: (파일: string) => string, 폰: string, 이름짓기: (자리: string) => string): { 값: string; 파일들: string[]; 이름: string }[] {
  if (!pc) return [{ 값: 'android', 파일들: [...파일들], 이름: 이름짓기(폰) }];
  return PC_PLATFORMS.map((값) => ({ 값, 파일들: 파일들.filter((f) => 윈도우값들(글(f)).includes(값)) }))
    .filter((c) => c.파일들.length > 0)
    .map((c) => ({ ...c, 이름: 이름짓기(c.값 === 'windows' ? 폰 : `${폰}:${c.값.slice('windows-'.length)}`) }));
}

/** PC 판정 줄의 「폰」 자리 — 패드 꼬리가 붙은 기록은 패드 이름으로 읽는다 */
export const 패드자리이름 = (자리: string): string => (자리.includes(':') ? `${자리.slice(자리.indexOf(':') + 1).toUpperCase()} 패드` : '키보드');

/**
 * 파일마다 지금 판정 — 이번에 쓸 수 있는 폰 · 계정을 주면 다시 볼 것도 고른다.
 * 값들은 PC 게임 케이스가 선언한 윈도우 값이다 — 시간이 모자라 한 패드라도 안 돌았으면 초록이 아니라 안돎이다(돈 패드만 보고 초록으로 세지 않게).
 * 케이스목록은 프로시저 파일의 케이스 번호(옛 꼴은 null) — 프로시저는 케이스마다 견주고 케이스 줄을 붙인다(authoring-proc-run `프로시저판정`)
 */
export function 폰판정들(
  대상: Record<string, number>, 판들: Map<string, 돌린판[]>, 있는폰들: readonly string[] = [], 계정들: readonly number[] = [1], 값들: (파일: string) => string[] = () => [], 케이스목록: (파일: string) => string[] | null = () => null,
): 판정줄[] {
  return Object.entries(대상)
    .map(([파일, 수정]): 판정줄 => {
      const 돈것 = 한판들(판들.get(파일), 수정);
      const 케이스들 = 케이스목록(파일);
      const 프 = 케이스들 === null ? null : 프로시저판정(케이스들, 판들.get(파일), 수정, 있는폰들, 계정들);
      const 판정 = 프?.파일 ?? 판정하기(돈것, 있는폰들, 계정들);
      const 돈값 = (값: string) => 돈것.some((p) => (값 === 'windows' ? !(p.폰 ?? '').includes(':') : (p.폰 ?? '').endsWith(`:${값.slice('windows-'.length)}`)));
      const 다돎 = 판정.상태 !== '초록' || 값들(파일).every(돈값);
      return 프 === null ? [파일, 다돎 ? 판정 : { 상태: '안돎' }] : [파일, 다돎 ? 판정 : { 상태: '안돎' }, 다돎 ? 프.케이스 : 프.케이스.map(([t]) => [t, { 상태: '안돎' }])];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

/** 테스트 고침이 맡긴 케이스(tcId 를 쉼표로) — 에이전트가 넘긴다. 고치기 전에 「그대로 한 번」 돌려 보려면 안 바뀐 케이스도 돌아야 한다 (도메인/게임 §3.10 「실패 자동 수정」 3 의 1) */
export const 고칠케이스환경 = 'AUTHORING_FIX_CASES';

/** 바뀐 파일 목록에 맡긴 케이스가 든 파일(`tests/<폴더 안 경로>`)을 더한다 — 폰고르기가 바뀐 케이스처럼 고른다. 프로시저 안 케이스는 그 프로시저 파일이다. 값이 없으면 목록 그대로고 케이스 파일도 안 읽는다 */
export function 고칠케이스더하기(바뀐: readonly string[], 값: string | undefined, 파일들: () => readonly { 경로: string; 글: string }[]): string[] {
  const tcIds = new Set((값 ?? '').split(',').map((x) => x.trim()).filter((x) => x !== ''));
  if (tcIds.size === 0) return [...바뀐];
  const 맡은것 = (f: { 경로: string; 글: string }) => f.경로.endsWith('.spec.ts') && (tcIds.has(f.경로.split('/').pop()!.slice(0, -'.spec.ts'.length)) || (프로시저케이스들(f.글) ?? []).some((t) => tcIds.has(t)));
  return [...new Set([...바뀐, ...파일들().filter(맡은것).map((f) => `tests/${f.경로}`)])];
}
