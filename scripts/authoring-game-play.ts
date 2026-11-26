// 조작 도우미 부르기 — 게임 작성 AI 가 잡은 디바이스에서 tests/<폴더>/helpers/ 의 함수(첫 인자 game)를 한 프로세스로 돌린다 (도메인/게임 §3.10 「조작 도우미」)
// control-cli 는 명령마다 화면이 멎기를 기다렸다 찍어 움직임이 끊긴다. 이 명령은 묶음을 한 번에 돌리고, 어떻게 끝나든 눌러 둔 입력을 놓는다
// 쓰는 법: npx tsx scripts/authoring-game-play.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초>] [--shots <초>] [--freeze] — game 은 케이스 몸통이 받는 것과 같은 드라이버다

import { pathToFileURL } from 'node:url';

import { gameLink, openGame } from '@platform/kit/game';
import { Game, flatten, type Command, type Link } from 'control-cli';

import { 기본화면초, 부를준비 } from './authoring-game-play-call.js';
import { 멈추기, 풀기 } from './authoring-game-play-freeze.js';
import { 기록남기기, 덧줄, 몇줄 } from './authoring-game-play-log.js';
import { type 도중화면, 간격정하기, 찍기시작 } from './authoring-game-play-shots.js';
import { type 나온것, 세기시작, 지도글 } from './authoring-game-play-spawns.js';
import { 막는글, 안적은새것 } from './authoring-game-play-gate.js';
import { type 멈춤보고, 멈춤보기시작 } from './authoring-game-play-stop.js';
import { 값읽기시작 } from './authoring-game-play-values.js';
import { 결과글 } from './authoring-game-state.js';
import { 정리알림, 지금지도 } from './authoring-game-find.js';
import { type 값기록, type 끝글줄, type 볼값, 수로, 판기록들 } from './authoring-learn-check.js';
import { 곳맵줄 } from './authoring-learn-play.js';
import { type 해볼것, 계획없이초, 배우는중인가, 배움막기 } from './authoring-learn-retro.js';
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
  /** 함수가 돈 시간 배율(못 읽으면 null) — 멈춘 게임을 풀었으면 푼 뒤 값이다. 함수가 배율을 바꿨나와 함께 10판 확인(authoring-game-wins)이 원래 속도만 센다 */
  배율: number | null;
  배율바꿈: boolean;
  /** 명령의 답을 못 받은 일 — 게임이 실패로 답한 것과 다르다(팜 거절 · 시간 초과 · 끊김) */
  통신오류: string | null;
  입력못놓음: boolean;
  /** 함수가 도는 동안 남긴 화면 — 초는 함수 시작부터. 안 켜면 빈 목록 */
  도중화면: 도중화면[];
  /** 실제로 쓴 도중 화면 간격(ms) — 한도 안에 40장이 다 들어가게 넓혔을 수 있다. 안 켰으면 0 */
  도중간격ms: number;
  /** 멈춰 가며 하기 — 멈추고 되읽은 배율(멈추기를 안 했으면 없다) */
  멈춘뒤배율?: number | null;
  /** 멈춤 · 풀기에서 AI 가 알아야 할 줄 */
  알림말: string[];
  /** 멈춤 표시가 있는데 못 풀었다 — 10판 확인은 이 판을 안 센다 */
  멈춘채: boolean;
  /** 판 도중 새로 나온 것 · 수가 바뀐 것 — 도중 화면을 켰을 때만 센다 */
  나온것?: 나온것;
  /** 계획으로 해 봤을 때 — 2초마다 읽은 볼값과 처음 어긋난 때 · 그 순간 사진 */
  값기록?: 값기록;
  어긋난사진?: Buffer;
  /** 함수가 끝난 순간 화면의 글자 — 「확인」 줄 검사가 읽는다 */
  끝글?: 끝글줄[];
  /** 함수를 부르기 직전의 나아감(덧.출발을 줬을 때) — 못 읽으면 null */
  출발?: number | null;
  /** 부르기 직전 · 도중에 바뀐 · 끝난 순간의 장면 이름 — 맵 정보는 본 장면에만 적는다(authoring-learn-play 맵검사) */
  장면들?: string[];
  /** 판 중간 멈춤 — 계획의 기대가 깨졌거나 처음 보는 오브젝트가 나와 함수를 끊고 게임을 멈췄다 */
  멈춤?: 멈춤보고;
  멈춤사진?: Buffer;
}

export interface 덧 {
  /** 도중 화면 간격(ms) — 안 주거나 0 이면 한 장도 안 찍고 명령도 더 안 보낸다 */
  도중화면ms?: number;
  /** 함수가 끝나면 게임을 멈추고 다음에 부를 때 푼다 */
  멈춤?: boolean;
  /** 멈춤 표시를 두는 자료 폴더 — 표시가 있으면 멈춤을 안 줘도 부르기 직전에 푼다 */
  자료?: string;
  /** 계획으로 해 본다 — 볼값을 2초마다 읽는다 */
  볼?: 해볼것;
  /** 함수를 부르기 직전에 이 값(나아감)을 한 번 읽는다 — 10판 확인이 판마다 같은 출발점인지 본다 */
  출발?: 볼값;
}

/**
 * 함수를 돌리고 거둔다. 끝나면(끝까지 · 던짐 · 한도 · 밖에서 끊음) 함수가 보내는 명령부터 막고 보낸 것의 답을 기다렸다 입력을 놓는다.
 * 막힌 명령은 답하지 않는다 — 던지면 오류를 삼키고 다시 부르는 반복이 쉬지 않고 돌아 거두는 시간이 안 온다.
 * 시간 배율은 함수가 바꿨을 때만 되돌린다(멈춤이면 멈추고 표시에 앞 값을 둔다) — 게임이 스스로 멈추고 푼 것(일시정지 창)을 덮지 않게
 */
export async function 돌린다(길: Link, 함수: (game: unknown) => unknown, 환경: Record<string, string | undefined>, 한도ms: number, 끊김?: AbortSignal, 덧?: 덧): Promise<조작결과> {
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
  const 풀림 = await 풀기(맨게임, 덧?.자료, 앞.배율, 해본다);
  const { 배율 } = 풀림;
  // 함수가 따로 띄운 일이 던지면 node 가 바로 꺼져 거두지 못한다 — 적어 두고 거두기까지 간다
  const 버려진 = (e: unknown): void => void 못한것.push(`기다리지 않은 일이 던짐: ${까닭(e)}`);
  process.on('unhandledRejection', 버려진);
  const 시작 = Date.now();
  // 멈춰 둔 게임을 못 풀었으면 함수를 부르지 않는다 — 안 흐르는 판에서 한도까지 돌다 「넘겼습니다」로 끝나면 까닭이 묻힌다
  const 돌릴까 = !풀림.멈춘채;
  const 간격ms = !돌릴까 || 덧?.도중화면ms === undefined || 덧.도중화면ms <= 0 ? 0 : 간격정하기(덧.도중화면ms, 한도ms);
  const 찍기 = 간격ms === 0 ? null : 찍기시작(맨게임, 간격ms, 시작);
  // 10판 확인처럼 화면을 끈 판은 원래 속도만 본다 — 세기도 같이 끈다
  const 세기 = 간격ms === 0 ? null : 세기시작(맨게임, 간격ms, 시작, 지도글(덧?.자료));
  await 세기?.준비;
  const 출발자리 = 덧?.출발;
  const 출발 = 출발자리 === undefined ? undefined : 수로(await 해본다('나아감 읽기', () => (출발자리.칸 === undefined ? 맨게임.text(출발자리.주소) : 맨게임.get(출발자리.주소, 출발자리.칸))));
  // 옛 SDK 는 장면을 못 읽는다 — 못 읽어도 조작은 하고 못한것에도 안 적는다
  const 장면읽기 = (): Promise<string | null> => 맨게임.scenes().then((x) => (typeof x.active === 'string' ? x.active : null), () => null);
  const 첫장면 = await 장면읽기();
  const 읽기 = !돌릴까 || 덧?.볼 === undefined ? null : 값읽기시작(맨게임, 덧.볼.계획, 덧.볼.볼값, 덧.볼.기대, 시작);
  // 계획으로 해 볼 때만 — 걸리면 넘음을 거절해 함수를 끊고 아래에서 멈춘다
  let 판멈춤: (왜: string) => void = () => {};
  let 멈춘까닭: string | null = null;
  const 멈춰보기 = 읽기 === null ? null : 멈춤보기시작(맨게임, 시작, { 값: 읽기.지금, 나온: () => 세기?.지금() ?? null, 로그앞: 앞.로그 }, (왜) => ((멈춘까닭 = 왜), 판멈춤(왜)));
  let 값: unknown;
  let 오류: string | undefined = 돌릴까 ? undefined : '멈춰 둔 게임을 못 풀어 함수를 부르지 않았다 — `npx control-cli -s=g timescale-set 1` 로 풀고 다시 부른다';
  let 시계: NodeJS.Timeout | undefined;
  try {
    const 넘음 = new Promise<never>((_, 거절) => {
      시계 = setTimeout(() => 거절(new Error(`제한 시간 ${한도ms / 1000}초를 넘겼습니다 — 함수를 나누거나 --max 를 늘립니다`)), 한도ms);
      const 끊음 = (): void => 거절(new Error('밖에서 명령을 끊었습니다'));
      판멈춤 = (왜) => 거절(new Error(`판 중간 멈춤 — ${왜}. 게임을 멈춰 뒀다(아래 멈춤 보고)`));
      if (끊김?.aborted === true) 끊음();
      else 끊김?.addEventListener('abort', 끊음, { once: true });
    });
    if (돌릴까) 값 = await Promise.race([Promise.resolve().then(() => 함수(game)), 넘음]);
  } catch (e) {
    오류 = 까닭(e);
  } finally {
    clearTimeout(시계);
  }
  const 걸린ms = Date.now() - 시작;
  찍기?.그친다();
  세기?.그친다();
  읽기?.그친다();
  멈춰보기?.그친다();
  const 멈춤 = (덧?.멈춤 === true || 멈춘까닭 !== null) && 돌릴까 ? await 멈추기(맨게임, 덧?.자료, 배율, 배율바꿈, 해본다) : null;
  막음 = true;
  for (const 끝 = Date.now() + 답기다림ms; 보내는중 > 0 && Date.now() < 끝; ) await 쉼(50);
  try {
    await 맨게임.resetInput();
  } catch (e) {
    입력못놓음 = true;
    오류 = `${오류 === undefined ? '' : `${오류} · `}입력을 못 놓았습니다(${까닭(e)}) — control-cli input-reset 으로 놓습니다`;
  }
  // 정말 멈췄을 때만 안 되돌린다 — 멈추라 했는데 못 멈춘 판(거절 · 표시를 못 씀)에 함수가 바꾼 배율이 남으면 게임이 그 속도로 계속 흐른다
  if (배율바꿈 && 배율 !== null && 멈춤?.멈춘뒤배율 !== 0) await 해본다('시간 배율 되돌리기', () => 맨게임.setTimeScale(배율));
  const 로그 = 앞.로그 === null ? null : await 해본다('로그 읽기', () => 맨게임.logs(앞.로그!));
  const 게임오류 = 앞.오류 === null ? null : await 해본다('오류 읽기', () => 맨게임.errors(앞.오류!));
  const 알림 = 앞.알림 === null ? null : await 해본다('알림 읽기', () => 맨게임.events(앞.알림!));
  const 찍기못함 = await 찍기?.끝난다();
  if (찍기못함 !== null && 찍기못함 !== undefined) 못한것.push(찍기못함);
  const 셈 = await 세기?.끝난다();
  if (typeof 셈?.못함 === 'string') 못한것.push(셈.못함);
  const 읽은 = await 읽기?.끝난다();
  if (typeof 읽은?.못함 === 'string') 못한것.push(읽은.못함);
  const 멈춘 = await 멈춰보기?.끝난다();
  if (typeof 멈춘?.못함 === 'string') 못한것.push(멈춘.못함);
  const 트리 = await 해본다('끝 화면 글 읽기', () => 맨게임.tree());
  // 옛 SDK · 가짜 게임은 트리 꼴이 다를 수 있다 — 못 읽으면 끝 글 없이 간다
  const 끝글 = !Array.isArray(트리?.tree) ? undefined : flatten(트리.tree).flatMap((e) => (e.node.text === undefined || e.node.text === '' ? [] : [{ 주소: e.address, 경로: e.path, 글: e.node.text }]));
  const 장면들 = [...new Set([첫장면, ...(셈?.나온?.장면바뀜.map((x) => x.장면) ?? []), await 장면읽기()].filter((x): x is string => x !== null))];
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
    도중화면: 찍기?.장들 ?? [],
    도중간격ms: 간격ms,
    ...(멈춤?.멈춘뒤배율 === undefined ? {} : { 멈춘뒤배율: 멈춤.멈춘뒤배율 }),
    알림말: [...풀림.알림말, ...(멈춤?.알림말 ?? [])],
    멈춘채: 풀림.멈춘채,
    ...(셈?.나온 ? { 나온것: 셈.나온 } : {}),
    ...(읽은 === undefined ? {} : { 값기록: 읽은.기록, ...(읽은.사진 === undefined ? {} : { 어긋난사진: 읽은.사진 }) }),
    ...(끝글 === undefined ? {} : { 끝글 }),
    ...(출발 === undefined ? {} : { 출발 }),
    ...(장면들.length === 0 ? {} : { 장면들 }),
    ...((멈춘?.멈춤 ?? null) === null ? {} : { 멈춤: 멈춘!.멈춤!, ...(멈춘!.사진 === undefined ? {} : { 멈춤사진: 멈춘!.사진 }) }),
  };
}

/** 0 끝까지 돌았다 · 1 함수가 던졌거나 한도를 넘겼다 · 2 부를 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const 것 = await 부를준비('authoring-game-play', '[조작 도우미]', 인자, 트리, env);
  if (것 === null) return 2;
  const { 이름, 넘길, 환경, 비밀들, 자료 } = 것;
  // 학습 세션에서 계획 없이 --max 도 안 줬으면 짧은 재기다 — 기본 90초를 60초로 줄인다
  const 초 = 배우는중인가(자료) && 것.계획 === undefined && !것.초준 ? Math.min(것.초, 계획없이초) : 것.초;
  const 안적은 = 안적은새것(자료);
  if (안적은 !== null) {
    console.error(막는글(안적은));
    return 2;
  }
  // 학습 세션만 — 앞 회고 · 계획 · 손만 고친 되풀이 · 다섯 번 안 늚을 본다
  const 지도줄 = (자료 === undefined ? null : 지금지도(자료))?.줄들 ?? [];
  const 막 = 배움막기(자료, 초, 것.계획, 지도줄, 자료 === undefined ? [] : 판기록들(자료));
  if (막 !== null && '막음' in 막) {
    console.error(`[조작 도우미] ${막.막음}`);
    return 2;
  }
  if (막 === null && 것.계획 !== undefined) console.error('[조작 도우미] 학습 세션이 아니라 --plan 을 안 쓴다 — 볼값을 안 읽는다');
  let r: 조작결과;
  // 셸이 한도에서 끊으면 SIGTERM 이 온다 — 눌러 둔 입력을 놓고 끝낸다
  const 끊기 = new AbortController();
  const 끊음 = (): void => 끊기.abort();
  process.once('SIGTERM', 끊음);
  process.once('SIGINT', 끊음);
  try {
    r = await 돌린다(길 ?? (await gameLink(환경)), 것.함수, 환경, 초 * 1000, 끊기.signal, { 도중화면ms: (것.화면초 ?? 기본화면초) * 1000, 멈춤: 것.멈춤, 자료, ...(막 === null ? {} : { 볼: 막 }) });
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
    ...덧줄(r, 기록),
    ...(r.멈춤 === undefined || 막 === null || 막.곳 === undefined ? [] : 곳맵줄(지도줄, 막.곳)),
    ...(r.오류 === undefined ? [] : [`오류: ${r.오류}`]),
    ...몇줄('게임 로그', r.로그),
    ...몇줄('게임 오류', r.게임오류),
    ...몇줄('알림', r.알림),
    ...(r.못한것.length === 0 ? [] : [`못 한 것: ${r.못한것.join(' · ')}`]),
  ].join('\n');
  console.log(비밀가리기(글, 비밀들));
  // 정리하라는 알림은 판을 하는 동안에도 보여야 한다 — 값을 찍은 뒤 맨 끝에 붙인다
  const 알림 = 자료 === undefined ? [] : 정리알림(자료);
  if (r.오류 === undefined) console.log(결과글(r.값, 비밀들));
  if (알림.length > 0) console.log(알림.join('\n'));
  return r.오류 === undefined ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 막힌 명령을 기다리는 함수가 남아 있을 수 있다 — 바로 끝낸다
  process.exit(await 실행(process.argv.slice(2)));
}
