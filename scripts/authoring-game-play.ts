// 조작 도우미 부르기 — 게임 작성 AI 가 잡은 디바이스에서 tests/<폴더>/helpers/ 의 함수(첫 인자 game)를 한 프로세스로 돌린다 (도메인/게임 §3.10 「조작 도우미」)
// control-cli 는 명령마다 화면이 멎기를 기다렸다 찍어 움직임이 끊긴다. 이 명령은 묶음을 한 번에 돌리고, 어떻게 끝나든 눌러 둔 입력을 놓는다
// 쓰는 법: npx tsx scripts/authoring-game-play.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초>] — game 은 케이스 몸통이 받는 것과 같은 드라이버다

import { lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { gameLink, openGame } from '@platform/kit/game';
import { Game, type Command, type Link } from 'control-cli';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자료환경 } from './authoring-check-game.js';
import { 게임자리 } from './authoring-game.js';
import { 결과글 } from './authoring-game-state.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 게임환경, 돌발팝업값 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';
import { 폴더인가 } from './authoring-screens-keep-io.js';

/** 자료 폴더 안 기록 자리 — 부를 때마다 값 · 로그 · 오류 · 화면 한 벌 */
export const 조작기록자리 = 게임자리.조작기록;
/** 셸 명령의 기본 한도(2분)에 게임에 붙는 시간과 거두는 시간을 남긴다 */
const 기본초 = 90;
/** 셸 명령의 최대 한도(10분)에 붙는 시간(켜지는 중이면 2분)과 거두는 시간을 남긴다 */
const 최대초 = 420;
/** 보낸 명령의 답을 기다리는 한도 — 팜이 명령 하나를 20초 안에 끊는다. 답 전에 거두면 늦게 닿은 누르기가 눌린 채 남는다 */
const 답기다림ms = 20_000;
const 찍을줄 = 20;
const 줄길이 = 200;

/** 도우미 파일 자리 — 일반 파일이고 실제 자리가 트리의 tests 안일 때만(상태 도우미 부르기와 같은 검사) */
export function 조작도우미자리(트리: string, 폴더: string, 이름: string): string | null {
  // 도우미 이름은 올릴 때 받는 꼴(공통/2 「파일 자리」)과 같다 — 돌려 볼 때만 되는 이름을 막는다
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(폴더) || !/^[a-z][a-z0-9-]{0,40}$/.test(이름)) return null;
  const 자리 = join(트리, 'tests', 폴더, 'helpers', `${이름}.helper.ts`);
  if (lstatSync(자리, { throwIfNoEntry: false })?.isFile() !== true) return null;
  return realpathSync(자리) === join(realpathSync(join(트리, 'tests')), 폴더, 'helpers', `${이름}.helper.ts`) ? 자리 : null;
}

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const 쉼 = (ms: number): Promise<void> => new Promise((깨운다) => setTimeout(깨운다, ms));

export interface 조작결과 {
  값?: unknown;
  오류?: string;
  걸린ms: number;
  로그: string[];
  게임오류: string[];
  알림: string[];
  화면?: Buffer;
  못한것: string[];
}

/**
 * 함수를 돌리고 거둔다. 끝나면(끝까지 · 던짐 · 한도 · 밖에서 끊음) 함수가 보내는 명령부터 막고 보낸 것의 답을 기다렸다 입력을 놓는다.
 * 막힌 명령은 답하지 않는다 — 던지면 오류를 삼키고 다시 부르는 반복이 쉬지 않고 돌아 거두는 시간이 안 온다.
 * 시간 배율은 함수가 바꿨을 때만 되돌린다 — 게임이 스스로 멈추고 푼 것(일시정지 창)을 덮지 않게
 */
export async function 돌린다(길: Link, 함수: (game: unknown) => unknown, 환경: Record<string, string | undefined>, 한도ms: number, 끊김?: AbortSignal): Promise<조작결과> {
  let 막음 = false;
  let 보내는중 = 0;
  let 배율바꿈 = false;
  const 문: Link = async (cmd: Command) => {
    if (막음) return new Promise<never>(() => {});
    const c = cmd as unknown as Record<string, unknown>;
    if (c.cmd === 'timescale-set' || (c.cmd === 'static-set' && String(c.prop).endsWith('timeScale'))) 배율바꿈 = true;
    보내는중 += 1;
    try {
      return await 길(cmd);
    } finally {
      보내는중 -= 1;
    }
  };
  const game = await openGame(환경, 문);
  const 맨게임 = new Game(길);
  const 못한것: string[] = [];
  const 해본다 = async <T,>(무엇: string, 일: () => Promise<T>): Promise<T | null> => {
    try {
      return await 일();
    } catch (e) {
      못한것.push(`${무엇}: ${까닭(e)}`);
      return null;
    }
  };
  // 옛 SDK 에는 없는 명령이 있다 — 못 읽어도 조작은 한다
  const 앞 = {
    배율: await 해본다('시간 배율 읽기', () => 맨게임.timeScale()),
    로그: (await 해본다('로그 읽기', () => 맨게임.logs(0)))?.last ?? null,
    오류: (await 해본다('오류 읽기', () => 맨게임.errors(0)))?.last ?? null,
    알림: (await 해본다('알림 읽기', () => 맨게임.events(0)))?.last ?? null,
  };
  // 함수가 따로 띄운 일이 던지면 node 가 바로 꺼져 거두지 못한다 — 적어 두고 거두기까지 간다
  const 버려진 = (e: unknown): void => void 못한것.push(`기다리지 않은 일이 던짐: ${까닭(e)}`);
  process.on('unhandledRejection', 버려진);
  const 시작 = Date.now();
  let 값: unknown;
  let 오류: string | undefined;
  let 시계: NodeJS.Timeout | undefined;
  try {
    const 넘음 = new Promise<never>((_, 거절) => {
      시계 = setTimeout(() => 거절(new Error(`제한 시간 ${한도ms / 1000}초를 넘겼습니다 — 함수를 나누거나 --max 를 늘립니다`)), 한도ms);
      const 끊음 = (): void => 거절(new Error('밖에서 명령을 끊었습니다'));
      if (끊김?.aborted === true) 끊음();
      else 끊김?.addEventListener('abort', 끊음, { once: true });
    });
    값 = await Promise.race([Promise.resolve().then(() => 함수(game)), 넘음]);
  } catch (e) {
    오류 = 까닭(e);
  } finally {
    clearTimeout(시계);
  }
  const 걸린ms = Date.now() - 시작;
  막음 = true;
  for (const 끝 = Date.now() + 답기다림ms; 보내는중 > 0 && Date.now() < 끝; ) await 쉼(50);
  try {
    await 맨게임.resetInput();
  } catch (e) {
    오류 = `${오류 === undefined ? '' : `${오류} · `}입력을 못 놓았습니다(${까닭(e)}) — control-cli input-reset 으로 놓습니다`;
  }
  const { 배율 } = 앞;
  if (배율바꿈 && 배율 !== null) await 해본다('시간 배율 되돌리기', () => 맨게임.setTimeScale(배율));
  const 로그 = 앞.로그 === null ? null : await 해본다('로그 읽기', () => 맨게임.logs(앞.로그!));
  const 게임오류 = 앞.오류 === null ? null : await 해본다('오류 읽기', () => 맨게임.errors(앞.오류!));
  const 알림 = 앞.알림 === null ? null : await 해본다('알림 읽기', () => 맨게임.events(앞.알림!));
  const 화면 = await 해본다('화면 찍기', () => 맨게임.screenshot());
  process.off('unhandledRejection', 버려진);
  for (const [이름, 답] of [['게임 로그', 로그], ['게임 오류', 게임오류], ['알림', 알림]] as const) {
    if ((답?.dropped ?? 0) > 0) 못한것.push(`${이름} 앞쪽 ${답!.dropped}줄은 밀려나 없다`);
    if (답?.restarted === true) 못한것.push(`${이름} 번호가 다시 시작됐다 — 도중에 게임이 다시 켜졌다`);
  }
  return {
    ...(오류 === undefined ? { 값 } : { 오류 }),
    걸린ms,
    로그: (로그?.logs ?? []).map((l) => `${l.occurredAt} ${l.type} ${l.message}`),
    게임오류: (게임오류?.errors ?? []).map((l) => `${l.occurredAt ?? l.time} ${l.type} ${l.message}${l.stack === '' ? '' : `\n${l.stack}`}`),
    알림: (알림?.events ?? []).map((e) => `${e.occurredAt} ${e.type}${'scene' in e ? ` ${e.scene}` : ''}`),
    ...(화면 === null ? {} : { 화면 }),
    못한것,
  };
}

/** 자료 폴더에 남긴다 — 지도에는 잰 값과 횟수만 올리고 원본은 여기 둔다. 자료 폴더가 없으면 null */
function 기록남기기(자료: string | undefined, 함수: string, 인자: unknown[], r: 조작결과, 비밀들: readonly string[], 지금 = new Date()): string | null {
  if (!자료 || !폴더인가(자료)) return null;
  const 폴더 = join(자료, 조작기록자리);
  try {
    mkdirSync(폴더, { recursive: true, mode: 0o755 });
  } catch (e) {
    r.못한것.push(`기록 남기기: ${까닭(e)}`);
    return null;
  }
  if (!폴더인가(폴더)) return null;
  const 이름 = `${지금.toISOString().replace(/\D/g, '').slice(0, 17)}-${함수}`;
  const { 화면, ...글 } = r;
  try {
    let 날글: string;
    try {
      날글 = JSON.stringify({ 함수, 인자, ...글 }, null, 2);
    } catch {
      날글 = JSON.stringify({ 함수, 인자, ...글, 값: `(JSON 으로 못 바꾸는 값 — ${String(글.값)})` }, null, 2);
    }
    // wx — 자식이 만든 링크를 따라 쓰지 않는다
    writeFileSync(join(폴더, `${이름}.json`), 비밀가리기(날글, 비밀들), { flag: 'wx' });
    if (화면 !== undefined) writeFileSync(join(폴더, `${이름}.jpg`), 화면, { flag: 'wx' });
    return join(폴더, 이름);
  } catch (e) {
    r.못한것.push(`기록 남기기: ${까닭(e)}`);
    return null;
  }
}

const 몇줄 = (머리: string, 줄들: readonly string[]): string[] =>
  줄들.length === 0 ? [] : [`${머리} ${줄들.length}줄`, ...줄들.slice(0, 찍을줄).map((x) => `  ${x.split('\n')[0]!.slice(0, 줄길이)}`), ...(줄들.length > 찍을줄 ? [`  … 나머지는 기록 파일에 있다`] : [])];

/** 0 끝까지 돌았다 · 1 함수가 던졌거나 한도를 넘겼다 · 2 부를 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const 한도자리 = 인자.indexOf('--max');
  const 초 = 한도자리 < 0 ? 기본초 : Number(인자[한도자리 + 1]);
  const [폴더, 파일, 이름, 인자글, ...남음] = 한도자리 < 0 ? 인자 : [...인자.slice(0, 한도자리), ...인자.slice(한도자리 + 2)];
  if (폴더 === undefined || 파일 === undefined || 이름 === undefined || 남음.length > 0 || !/^[\p{L}\p{N}_$]+$/u.test(이름) || !(초 > 0 && 초 <= 최대초)) {
    console.error(`쓰는 법: npx tsx scripts/authoring-game-play.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초 — ${최대초}까지>]`);
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error('[조작 도우미] 잡은 디바이스가 없다 — `npx control-cli hold --minutes 30`(PC 게임은 `--pc`)으로 잡고 게임을 켠 뒤 다시 부른다');
    return 2;
  }
  let 넘길: unknown[];
  let 비밀들: string[];
  try {
    const 값 = JSON.parse(인자글 ?? '[]') as unknown;
    if (!Array.isArray(값)) throw new Error('인자는 JSON 배열로 준다');
    넘길 = 값;
    비밀들 = 환경비밀번호들(env);
  } catch (e) {
    console.error(`[조작 도우미] ${까닭(e)}`);
    return 2;
  }
  const 자리 = 조작도우미자리(트리, 폴더, 파일);
  if (자리 === null) {
    console.error(`[조작 도우미] tests/${폴더}/helpers/${파일}.helper.ts 가 없다 — 먼저 쓴다(이름은 영문 소문자 · 숫자 · -)`);
    return 2;
  }
  let 모듈: Record<string, unknown>;
  try {
    모듈 = (await import(pathToFileURL(자리).href)) as Record<string, unknown>;
  } catch (e) {
    console.error(`[조작 도우미] 도우미 파일을 못 읽었다 — ${비밀가리기(까닭(e), 비밀들)}`);
    return 2;
  }
  const 함수 = 모듈[이름];
  if (typeof 함수 !== 'function') {
    console.error(`[조작 도우미] 「${이름}」 은 도우미 파일이 내보낸 함수가 아니다 — 있는 것: ${Object.keys(모듈).filter((k) => typeof 모듈[k] === 'function').join(' · ') || '없음'}`);
    return 2;
  }
  const 자료 = env[게임자료환경];
  const 환경 = { ...env, ...게임환경(폰), PLATFORM_PAD: '', PLATFORM_GAME_POPUPS: 돌발팝업값(자료) };
  let r: 조작결과;
  // 셸이 한도에서 끊으면 SIGTERM 이 온다 — 눌러 둔 입력을 놓고 끝낸다
  const 끊기 = new AbortController();
  const 끊음 = (): void => 끊기.abort();
  process.once('SIGTERM', 끊음);
  process.once('SIGINT', 끊음);
  try {
    r = await 돌린다(길 ?? (await gameLink(환경)), (game) => (함수 as (...a: unknown[]) => unknown)(game, ...넘길), 환경, 초 * 1000, 끊기.signal);
  } catch (e) {
    console.error(`[조작 도우미] 게임에 못 붙었다 — ${비밀가리기(까닭(e), 비밀들)}`);
    return 2;
  } finally {
    process.off('SIGTERM', 끊음);
    process.off('SIGINT', 끊음);
  }
  const 기록 = 기록남기기(자료, 이름, 넘길, r, 비밀들);
  const 글 = [
    `[조작 도우미] ${이름} ${r.오류 === undefined ? '끝' : '멈춤'} · ${(r.걸린ms / 1000).toFixed(1)}초${기록 === null ? '' : ` · 기록 ${기록}.json${r.화면 === undefined ? '' : ' · 끝 화면 .jpg'}`}`,
    ...(r.오류 === undefined ? [] : [`오류: ${r.오류}`]),
    ...몇줄('게임 로그', r.로그),
    ...몇줄('게임 오류', r.게임오류),
    ...몇줄('알림', r.알림),
    ...(r.못한것.length === 0 ? [] : [`못 한 것: ${r.못한것.join(' · ')}`]),
  ].join('\n');
  console.log(비밀가리기(글, 비밀들));
  if (r.오류 !== undefined) return 1;
  console.log(결과글(r.값, 비밀들));
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 막힌 명령을 기다리는 함수가 남아 있을 수 있다 — 바로 끝낸다
  process.exit(await 실행(process.argv.slice(2)));
}
