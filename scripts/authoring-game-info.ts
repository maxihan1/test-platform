// 정보 모으기 명령 — 맵 시도 수만큼 해 보고도 못 깬 곳에서 웨이브를 넘겨 가며 처음 나온 종류를 값 파일로 남긴다 (치트 표시 · 도메인/게임 「게임 배우기」 「게임 정보 먼저 쌓기」 ③)
// 쓰는 법: npx tsx scripts/authoring-game-info.ts <자료 폴더> <곳 열쇠> --call '<주소>|<컴포넌트.메서드>[|<인자1>,<인자2>]' [--call …] [--steps <n>] [--wait <초>]
// 함수 이름은 게임마다 다르다 — 게임을 배우는 AI 가 찾아 넘긴다. 이 명령 밖에서 call 을 부르는 길은 지침이 막는다
// 잡은 디바이스에서 게임을 켜 둔 채 부른다. 값은 웨이브를 넘겨 본 것이라 값 파일과 기록에 치트 표시가 붙고 승패 근거로 못 쓴다
import { pathToFileURL } from 'node:url';

import { gameLink } from '@platform/kit/game';
import { Game, type Link } from 'control-cli';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 치트표시쓰기 } from './authoring-game-cheat-mark.js';
import { 정리알림, 지금지도 } from './authoring-game-find.js';
import { 기록남기기 } from './authoring-game-play-log.js';
import { type 곳판, 곳셈, 넘김판 } from './authoring-learn-play.js';
import { 풀기 } from './authoring-game-play-freeze.js';
import { type 조작결과 } from './authoring-game-play.js';
import { 나온것줄, 세기시작, 지도글 } from './authoring-game-play-spawns.js';
import { 판기록들, type 판기록 } from './authoring-learn-check.js';
import { 놀이시작뒤 } from './authoring-learn-io.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 게임환경, 돌발팝업값 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';

/** 맵 시도 수(넘김판)와 같다 — 그 판 수를 하고도 못 깬 곳에서 다음 맵으로 넘기기 전에 한 번 연다 */
export const 열림판수 = 넘김판;
const 기본단계 = 10;
const 최대단계 = 100;
const 기본대기초 = 3;
const 최대대기초 = 60;
/** 셸 명령의 최대 한도(10분)에 붙는 시간과 거두는 시간을 남긴다 */
const 최대초 = 360;
/** 명령이 거듭 안 먹히면 그친다 — 틀린 함수 이름으로 한도까지 도는 것을 막는다 */
const 이어실패한도 = 2;
/** 나온 종류를 세는 간격 — 단계마다 몇 초 기다리는 동안 몇 번 세도 되게 */
const 세는간격ms = 1_000;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const 쉼 = (ms: number): Promise<void> => new Promise((깨운다) => setTimeout(깨운다, ms));

export interface 부름 {
  주소: string;
  메서드: string;
  /** 글자로 보낸다 — SDK 가 메서드 칸 타입으로 바꾼다. 없으면 인자 없는 메서드 */
  인자?: string[];
}
export interface 깃발들 {
  자료: string;
  곳: string;
  부름들: 부름[];
  단계: number;
  대기초: number;
}

const 부름글 = (x: 부름): string => `${x.주소}|${x.메서드}${x.인자 === undefined ? '' : `|${x.인자.join(',')}`}`;

// 메서드 이름은 글자로 시작한다 — 「1.5」 같은 인자가 메서드로 읽히지 않게
const 메서드꼴 = /^[\p{L}_$][\p{L}\p{N}_$]*(?:\.[\p{L}_$][\p{L}\p{N}_$]*)+$/u;

/**
 * `--call '<주소>|<컴포넌트.메서드>[|<인자1>,<인자2>]'` — 주소 안에 `|` 가 있을 수 있어 뒤에서부터 가른다.
 * `|` 가 둘 이상이면 세 조각(주소 | 메서드 | 인자)을 먼저 본다 — 인자가 `Boss.Final` 처럼 메서드 꼴이어도 인자로 읽는다.
 * 세 조각이 아니면 맨 끝이 메서드 꼴인 인자 없는 호출이다(보스를 불러내는 `CheatSpawnFinalBoss(1)` 같은 것은 앞 꼴)
 */
function 부름읽기(글: string): 부름 | null {
  const 끝자리 = 글.lastIndexOf('|');
  if (끝자리 < 1) return null;
  const 끝 = 글.slice(끝자리 + 1).trim();
  const 앞자리 = 글.lastIndexOf('|', 끝자리 - 1);
  if (앞자리 >= 1) {
    const 주소 = 글.slice(0, 앞자리).trim();
    const 메서드 = 글.slice(앞자리 + 1, 끝자리).trim();
    if (주소 !== '' && 메서드꼴.test(메서드)) {
      const 인자 = 끝 === '' ? [] : 끝.split(',').map((x) => x.trim().replace(/^(["'])(.*)\1$/, '$2'));
      return { 주소, 메서드, ...(인자.length === 0 ? {} : { 인자 }) };
    }
  }
  const 주소 = 글.slice(0, 끝자리).trim();
  return 메서드꼴.test(끝) && 주소 !== '' ? { 주소, 메서드: 끝 } : null;
}

/** 인자를 읽는다 — 틀리면 까닭 글 */
export function 깃발읽기(인자: readonly string[]): 깃발들 | string {
  const 남음: string[] = [];
  const 부름들: 부름[] = [];
  let 단계 = 기본단계;
  let 대기초 = 기본대기초;
  for (let i = 0; i < 인자.length; i += 1) {
    const x = 인자[i]!;
    const 값 = 인자[i + 1];
    if (x === '--call') {
      const 부 = 값 === undefined ? null : 부름읽기(값);
      if (부 === null) return '--call 은 \'<주소>|<컴포넌트.메서드>\' 나 \'<주소>|<컴포넌트.메서드>|<인자1>,<인자2>\' 로 준다';
      부름들.push(부);
      i += 1;
    } else if (x === '--steps' || x === '--wait') {
      if (값 === undefined || !/^\d+$/.test(값)) return `${x} 는 자연수로 준다`;
      if (x === '--steps') 단계 = Number(값);
      else 대기초 = Number(값);
      i += 1;
    } else 남음.push(x);
  }
  const [자료, 곳, ...남은] = 남음;
  if (자료 === undefined || 곳 === undefined || 남은.length > 0) return '자료 폴더와 곳 열쇠를 준다';
  if (부름들.length === 0) return '--call 을 하나 이상 준다';
  if (단계 < 1 || 단계 > 최대단계) return `--steps 는 1 부터 ${최대단계} 까지`;
  if (대기초 < 1 || 대기초 > 최대대기초) return `--wait 는 1 부터 ${최대대기초} 까지`;
  if (단계 * 대기초 > 최대초) return `--steps × --wait 가 ${최대초}초를 넘는다 — 셸 한도 안에 끝나게 줄인다`;
  return { 자료, 곳, 부름들, 단계, 대기초 };
}

export type 열림 = { 열림: true; 곳판: 곳판 } | { 열림: false; 까닭: string };

/** 열림 조건 — 그 곳을 열림판수만큼 하고도 아직 못 깼을 때만. 아니면 까닭 */
export function 열림조건(줄들: Parameters<typeof 곳셈>[0], 기록들: readonly 판기록[], 곳: string): 열림 {
  const 셈 = 곳셈(줄들, 기록들).find((x) => x.열쇠 === 곳);
  if (셈 === undefined) return { 열림: false, 까닭: `${곳} 는 깰 곳이 아니다 — 그 STAGE 줄에 data.결과 가 있어야 판 수를 센다` };
  if (셈.깸 > 0) return { 열림: false, 까닭: `${곳} 는 이미 깼다(${셈.판}판 중 ${셈.깸}) — 웨이브를 넘기지 않고 플레이하며 읽는다` };
  // 한 번이면 된다 — 지침이 call 을 막는 예외는 다음 맵으로 넘기기 전 한 번이다
  if (셈.정보 === true) return { 열림: false, 까닭: `${곳} 는 이미 정보 모으기를 했거나 못 하는 이유를 적었다 — 다음 맵을 해 본다` };
  if (셈.판 < 열림판수) return { 열림: false, 까닭: `${곳} 는 ${셈.판}판 해 봤다 — ${열림판수}판을 해 보고도 못 깬 곳에서만 연다. 먼저 플레이하며 나온 것을 읽는다` };
  return { 열림: true, 곳판: 셈 };
}

/** 값 파일 · 기록에 붙는 치트 표시 */
export const 치트표시 = (부름들: readonly 부름[]): { 치트: true; call: string[] } => ({ 치트: true, call: 부름들.map(부름글) });

/** 0 모았다 · 1 call 이 거듭 안 먹혔다 · 2 열 수 없거나 붙을 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const 깃발 = 깃발읽기(인자);
  if (typeof 깃발 === 'string') {
    console.error(`[정보 모으기] ${깃발}\n쓰는 법: npx tsx scripts/authoring-game-info.ts <자료 폴더> <곳 열쇠> --call '<주소>|<컴포넌트.메서드>[|<인자1>,<인자2>]' [--call …] [--steps <1~${최대단계}>] [--wait <초 1~${최대대기초}>]`);
    return 2;
  }
  const { 자료, 곳, 부름들, 단계, 대기초 } = 깃발;
  const 지도 = 지금지도(자료);
  if (지도 === null) {
    console.error('[정보 모으기] 게임 지도를 못 읽었다 — 자료 폴더가 맞는지 본다');
    return 2;
  }
  const 열림 = 열림조건(지도.줄들, 놀이시작뒤(자료, 판기록들(자료)), 곳);
  if (!열림.열림) {
    console.error(`[정보 모으기] 안 연다 — ${열림.까닭}`);
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error('[정보 모으기] 잡은 디바이스가 없다 — `npx control-cli hold --minutes 30`(PC 게임은 `--pc`)으로 잡고 게임을 켠 뒤 다시 부른다');
    return 2;
  }
  let 비밀들: string[];
  let game: Game;
  try {
    비밀들 = 환경비밀번호들(env);
    game = new Game(길 ?? (await gameLink({ ...env, ...게임환경(폰), PLATFORM_PAD: '', PLATFORM_GAME_POPUPS: 돌발팝업값(자료) })));
  } catch (e) {
    console.error(`[정보 모으기] 게임에 못 붙었다 — ${까닭(e)}`);
    return 2;
  }
  const 못한것: string[] = [];
  const 해본다 = async <T,>(무엇: string, 일: () => Promise<T>): Promise<T | null> => {
    try {
      return await 일();
    } catch (e) {
      못한것.push(`${무엇}: ${까닭(e)}`);
      return null;
    }
  };
  // 멈춰 둔 게임이면 푼다 — 멈춘 채 웨이브를 넘겨 봐야 아무것도 안 나온다
  const 풀림 = await 풀기(game, 자료, await 해본다('시간 배율 읽기', () => game.timeScale()), 해본다);
  if (풀림.멈춘채) {
    console.error(`[정보 모으기] ${풀림.알림말.join(' · ')}`);
    return 2;
  }
  const 시작 = Date.now();
  const 표시 = 치트표시(부름들);
  const 세기 = 세기시작(game, 세는간격ms, 시작, 지도글(자료), 자료, 표시);
  await 세기.준비;
  let 이어실패 = 0;
  let 돈단계 = 0;
  // 먹힌 단계만 센다 — 함수 이름이 틀려 다 안 먹혔는데 정보 모으기를 한 것으로 치면 다음 맵이 열린다
  let 먹힌단계 = 0;
  for (let n = 1; n <= 단계 && 이어실패 < 이어실패한도; n += 1) {
    let 먹힘 = 0;
    for (const 부 of 부름들) {
      try {
        await game.callMethod(부.주소, 부.메서드, 부.인자 ?? []);
        먹힘 += 1;
      } catch (e) {
        못한것.push(`${n}단계 ${부름글(부)}: ${까닭(e)}`);
      }
    }
    돈단계 = n;
    if (먹힘 > 0) 먹힌단계 += 1;
    이어실패 = 먹힘 === 0 ? 이어실패 + 1 : 0;
    await 쉼(대기초 * 1000);
  }
  const 셈 = await 세기.끝난다();
  if (셈.못함 !== null) 못한것.push(셈.못함);
  await 해본다('입력 놓기', () => game.resetInput());
  // 이 판은 웨이브를 넘긴 판이다 — 이어서 부른 조작 도우미 기록에 치트 표시를 달게 장면과 때를 남긴다
  if (돈단계 > 0) {
    const 지금장면 = await 해본다('장면 읽기', () => game.scenes());
    const 표시못씀 = 치트표시쓰기(자료, typeof 지금장면?.active === 'string' ? 지금장면.active : null);
    if (표시못씀 !== null) 못한것.push(`치트 표시 파일 쓰기: ${표시못씀}`);
  }
  const r: 조작결과 & { 치트: true; call: string[]; 곳: string } = {
    값: { 정보모으기: { 곳, 단계: 먹힌단계, 돈단계 } }, 걸린ms: Date.now() - 시작, 로그: [], 게임오류: [], 알림: [], 못한것, 배율: 풀림.배율, 배율바꿈: false, 통신오류: null, 입력못놓음: false,
    도중화면: [], 도중간격ms: 0, 알림말: 풀림.알림말, 멈춘채: false, ...(셈.나온 === null ? {} : { 나온것: 셈.나온 }), ...표시, 곳,
  };
  const 기록 = 기록남기기(자료, '정보모으기', 인자, r, 비밀들);
  const 새 = 셈.나온?.펼침.filter((x) => x.글 !== undefined).length ?? 0;
  console.log(비밀가리기([
    `[정보 모으기] ${곳} ${돈단계}단계 · ${((Date.now() - 시작) / 1000).toFixed(0)}초 · 치트(웨이브 넘기기) — 값 파일 ${새}종류${기록 === null ? '' : ` · 기록 ${기록}.json`}`,
    '이 값은 call 로 웨이브를 넘겨 본 것이다 — 값 파일에 치트 표시가 붙었고 승패 근거로 쓰지 않는다. 이 판에서 이어 부르는 조작 도우미 기록도 치트로 적히고 판 수에 안 센다(장면을 떠나면 풀린다)',
    ...(셈.나온 === null ? [] : 나온것줄(셈.나온, null, 기록 === null ? null : `${기록}-새것.txt`)),
    ...(못한것.length === 0 ? [] : [`못 한 것: ${못한것.slice(0, 8).join(' · ')}`]),
  ].join('\n'), 비밀들));
  for (const 줄 of 정리알림(자료)) console.log(줄);
  return 이어실패 >= 이어실패한도 ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await 실행(process.argv.slice(2)));
}
