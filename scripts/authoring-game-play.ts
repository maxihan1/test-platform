// 조작 도우미 부르기 — 게임 작성 AI 가 잡은 디바이스에서 tests/<폴더>/helpers/ 의 함수(첫 인자 game)를 한 프로세스로 돌린다 (도메인/게임 §3.10 「조작 도우미」)
// control-cli 는 명령마다 화면이 멎기를 기다렸다 찍어 움직임이 끊긴다. 이 명령은 묶음을 한 번에 돌리고, 어떻게 끝나든 눌러 둔 입력을 놓는다
// 쓰는 법: npx tsx scripts/authoring-game-play.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초>] — game 은 케이스 몸통이 받는 것과 같은 드라이버다

import { pathToFileURL } from 'node:url';

import { gameLink, openGame } from '@platform/kit/game';
import { Game, type Command, type Link } from 'control-cli';

import { 부를준비 } from './authoring-game-play-call.js';
import { 기록남기기, 몇줄 } from './authoring-game-play-log.js';
import { 결과글 } from './authoring-game-state.js';
import { 비밀가리기 } from './authoring-reverse.js';

/** 보낸 명령의 답을 기다리는 한도 — 팜이 명령 하나를 20초 안에 끊는다. 답 전에 거두면 늦게 닿은 누르기가 눌린 채 남는다 */
const 답기다림ms = 20_000;

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
  /** 부르기 앞의 시간 배율(못 읽으면 null)과 함수가 배율을 바꿨나 — 10판 확인(authoring-game-wins)은 원래 속도만 센다 */
  배율: number | null;
  배율바꿈: boolean;
  /** 명령의 답을 못 받은 일 — 게임이 실패로 답한 것과 다르다(팜 거절 · 시간 초과 · 끊김) */
  통신오류: string | null;
  입력못놓음: boolean;
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
  let 통신오류: string | null = null;
  let 입력못놓음 = false;
  const 문: Link = async (cmd: Command) => {
    if (막음) return new Promise<never>(() => {});
    const c = cmd as unknown as Record<string, unknown>;
    if (c.cmd === 'timescale-set' || (c.cmd === 'static-set' && String(c.prop).endsWith('timeScale'))) 배율바꿈 = true;
    보내는중 += 1;
    try {
      return await 길(cmd);
    } catch (e) {
      통신오류 ??= 까닭(e);
      throw e;
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
    입력못놓음 = true;
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
    배율,
    배율바꿈,
    통신오류,
    입력못놓음,
  };
}

/** 0 끝까지 돌았다 · 1 함수가 던졌거나 한도를 넘겼다 · 2 부를 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const 것 = await 부를준비('authoring-game-play', '[조작 도우미]', 인자, 트리, env);
  if (것 === null) return 2;
  const { 이름, 넘길, 초, 환경, 비밀들, 자료 } = 것;
  let r: 조작결과;
  // 셸이 한도에서 끊으면 SIGTERM 이 온다 — 눌러 둔 입력을 놓고 끝낸다
  const 끊기 = new AbortController();
  const 끊음 = (): void => 끊기.abort();
  process.once('SIGTERM', 끊음);
  process.once('SIGINT', 끊음);
  try {
    r = await 돌린다(길 ?? (await gameLink(환경)), 것.함수, 환경, 초 * 1000, 끊기.signal);
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