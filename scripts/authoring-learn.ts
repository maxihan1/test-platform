// 게임 배우기 — 케이스를 쓰기 전에 학습 세션을 이어 띄워 게임을 배우고, 지도만 본 새 세션이 시험을 본다 (도메인/게임 §3.10 「게임 배우기」 · GAME-F6-03)
// 언제 끝낼지는 에이전트만 정한다 — AI 에게 시각을 보여 줬더니 마감을 어림해 48분 남기고 스스로 끝냈다(2026-11-26 다섯 번째 실측)
// 세션끼리는 대화를 넘기지 않는다 — 세션이 끝날 때마다 배운 줄을 올리고 지도를 다시 받아 다음 세션이 지도만 이어받는다
import { lstatSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { 띄운결과 } from './authoring-explore.js';
import { 게임자리, 요소상한 } from './authoring-game.js';
import { 적은줄들, 지금지도 } from './authoring-game-find.js';
import { 멈춤표시읽기, 멈춤표시지우기 } from './authoring-game-freeze.js';
import { 시험감고르기, 시험답읽기, 시험줄, 채점하기 } from './authoring-learn-exam.js';
import { 배우는중에, 배우는중지우기, 배움올리기, 상태쓰기, 상태읽기, 케이스시작적기 } from './authoring-learn-io.js';
import { 물음트리, 오늘글 } from './authoring-game-tree.js';
import { type 배울것, 배울것고르기, 배울것없나, 쪽지글, 쪽지열쇠 } from './authoring-learn-map.js';
import { 판기록들 } from './authoring-learn-check.js';
import { 인수인계 } from './authoring-learn-handoff.js';
import { 남은배울것 } from './authoring-learn-retro.js';
import { type 세션거리, type 학습결과, type 학습손, 못뜬것은끊김, 이음글 } from './authoring-learn-tail.js';
import { 끝낼상태 } from './authoring-progress.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';
import { 컨텍스트크기 } from './authoring-usage.js';

const 분 = 60_000;
// 앱 배우기만 쓰는 총 시간 — 게임 배우기는 2026-11-26 사용자가 2시간 한도를 없앴다. 세션은 컨텍스트 60% 에서만 바꾼다
const 총_ms = 120 * 분;
/** 시험 · 틀린 줄 다시 배우기 한 세션 — 에이전트만 안다(AI 에게 안 보인다). 네 번째 실측의 시험이 10분이었다 */
const 시험_ms = 15 * 분;
/** 이어 작성 · 반영 — 고친 요구에 닿는 줄만 한 세션 */
const 부분_ms = 30 * 분;
/** AI 가 스스로 끝낸 세션을 이어 돌렸는데 해 본 것이 없는 일이 이만큼 이어지면 그친다 — 디바이스 · 게임이 막혀 헛돈다 */
const 헛이음상한 = 2;
/** 작성 모델의 컨텍스트 창 — 네 번째 실측의 케이스 세션이 76만까지 갔다 */
const 컨텍스트창 = 1_000_000;
const 정리토큰 = 컨텍스트창 * 0.55;
const 교대토큰 = 컨텍스트창 * 0.6;
/** 한 줄도 못 배운 세션이 이만큼 이어지면 그친다 — 디바이스를 못 잡았거나 게임이 안 켜지는 채로 헛돈다 */
const 빈손상한 = 2;
/** 마감 앞 정리하라고 알리는 때 */
const 정리앞_ms = 5 * 분;
/** 이보다 적게 남았으면 세션을 새로 띄우지 않는다 — 게임을 켜고 그 자리까지 가는 데만 몇 분이다 */
const 최소_ms = 10 * 분;
/** 앱 배우기도 같은 시간 · 교대 값을 쓴다 (도메인/작성 §3.6 「★ 앱 배우기」 「배우기 세션」) */
export const 학습값 = { 총_ms, 부분_ms, 정리토큰, 교대토큰, 빈손상한, 정리앞_ms, 최소_ms } as const;

export type { 한번결과, 세션거리, 학습손, 학습결과 } from './authoring-learn-tail.js';
export { 못뜬것은끊김 } from './authoring-learn-tail.js';

/** 건너뛰었어도 끝에 케이스 시작을 적는다 — 게임 규칙 보류가 대는 판 기록은 이 뒤 것이어야 한다 */
export const 학습하기 = (o: 학습손): Promise<학습결과> => 배우고(o).finally(() => 케이스시작적기(o.자료, (o.지금 ?? Date.now)()));

async function 배우고(o: 학습손): Promise<학습결과> {
  const 앞낸것: string[] = [];
  // 앞 실행이 남긴 「정리하라」 알림이 케이스를 쓰는 세션의 찾기 명령에 찍히지 않게 — 배우지 않는 길에서도 지운다
  const 알림지우기 = (): void => rmSync(join(o.자료, 게임자리.학습알림), { force: true });
  알림지우기();
  // 「다섯 번 안 늚」은 이번 실행에서 다시 센다
  rmSync(join(o.자료, 게임자리.그만), { force: true });
  rmSync(join(o.자료, 게임자리.늚), { force: true });
  // 앞 실행이 끊겨 남긴 표시가 케이스를 쓰는 세션의 판을 막지 않게
  배우는중지우기(o.자료);
  const 지금 = o.지금 ?? Date.now;
  // 케이스 작성 세션부터 잇는 폴더 · 학습을 마친 폴더다
  if ((안전히읽기(o.자료, 게임자리.탐색지남, 1_000_000)?.trim() ?? '') !== '') return { 앞낸것 };
  const 상태 = 상태읽기(o.자료);
  if (상태.끝) return { 앞낸것 };
  const 건너뛴다 = (왜: string, 알릴것: boolean): 학습결과 => {
    o.알린다(`게임 학습을 건너뛴다 — ${왜}`);
    if (알릴것) 상태쓰기(o.자료, { ...상태, 안함: 왜 });
    return { 앞낸것 };
  };
  if (o.못함 !== null) return 건너뛴다(o.못함, true);
  const 빌드 = await o.빌드();
  // 케이스를 쓰는 세션의 명령(authoring-learn-prd · authoring-game-wins)이 빌드가 바뀐 줄 · 기록을 가른다
  if (빌드 !== undefined) 새로쓰기(join(o.자료, 게임자리.빌드), 빌드);
  const 볼것 = (): 배울것 | null => {
    const 지도 = 지금지도(o.자료);
    return 지도 === null ? null : 배울것고르기(지도, { ...(빌드 === undefined ? {} : { 빌드 }), 오늘: 오늘글(지금()), 게임글: 안전히읽기(o.자료, 게임자리.게임글, 요소상한), ...(o.번호들 === undefined ? {} : { 번호들: o.번호들 }) });
  };
  const 처음 = 볼것();
  if (처음 === null) return 건너뛴다('게임 지도를 못 받았다', true);
  if (상태.쓴ms === 0 && 배울것없나(처음)) return 건너뛴다('배울 것이 없다(빈 종류 · 열린 물음 · 판에서 안 써 본 것 · 다시 볼 빌드가 없다)', false);

  // 이어받은 폴더의 트리는 앞 세션 것 그대로다 — 다시 가져오면 AI 가 지운 도우미가 되살아난다
  if (상태.쓴ms === 0) o.도우미가져오기();
  const 부분 = o.번호들 !== undefined;
  const 총 = 부분 ? 부분_ms : 총_ms;
  let 못올림: string[] = [];
  const 남은 = (): number => 총 - 상태.쓴ms;
  // 다 배우는 세션은 한도가 없다 — 컨텍스트 교대와 끝 조건으로만 끝난다
  const 배움남은 = (): number => (부분 ? 남은() : Infinity);
  const 시험제한 = (): number => 시험_ms;

  /** 스스로 — AI 가 스스로 끝냈다(컨텍스트 교대 · 마감으로 끊긴 것이 아니다) */
  type 세션끝 = { 열쇠수: number; 스스로: boolean } | { 끝: 띄운결과 } | { 못잡음: true };

  /** 놓으면 그 게임은 꺼진다 — 멈춰 둔 표시가 남으면 다음에 잡은 게임이 스스로 멈춘 화면을 풀어 버린다 */
  const 놓는다 = async (): Promise<void> => {
    await o.놓기();
    멈춤표시지우기(o.자료);
  };
  /** 쥔 디바이스에서 앞 세션이 `--freeze` 로 멈춘 채 끝났나 — 다음 세션이 「판이 멈춰 있다」를 알고 시작한다 */
  const 멈춤 = (): { 멈춤?: true } => (o.쥐었나() && 멈춤표시읽기(o.자료) !== null ? { 멈춤: true } : {});

  /** 세션 하나 — 마감 · 컨텍스트에서 끊고, 적은 줄을 올린다. 작성을 끝내야 하면 띄운결과 */
  const 한세션 = async (거리: (남은분: number) => 세션거리, 제한재기: () => number, 이음?: string): Promise<세션끝> => {
    // 다음 세션을 띄울 때만 묻는다 — 다 배웠으면 어차피 놓는다. 기다린 시간은 배운 시간에 안 넣는다
    if (앞낸것.length > 0 && o.쥐었나() && (await o.양보())) {
      o.알린다('PC 를 기다리는 정식 실행이 있어 비켜 준다 — 다시 비면 배운 조작 도우미로 그 자리까지 가서 잇는다');
      await 놓는다();
      const 비었나 = await o.빈것기다리기();
      if (o.멈추라했다()) return { 끝: { 돌린것: { 코드: null, 낸것: '', 오류: '', 시간초과: false, 멈춤으로죽음: true }, 크레딧으로: false, 앞낸것: [] } };
      if (!비었나) return { 못잡음: true };
    }
    const 제한 = 제한재기();
    const 알림 = (글: string): void => {
      try {
        새로쓰기(join(o.자료, 게임자리.학습알림), 글);
      } catch (e) {
        o.알린다(`정리하라는 알림을 못 남겼다 — ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    const 끊기 = new AbortController();
    // 한도 없는 배우기 세션은 컨텍스트로만 끊는다 — 남은 시간을 알리면 AI 가 그것으로 끝을 어림한다
    const 정리때 = Number.isFinite(제한) ? setTimeout(() => 알림('곧 세션을 끊는다 — 하던 것을 적고 쪽지(`play:쪽지`)를 고쳐 쓴 뒤 끝낸다'), Math.max(0, 제한 - 정리앞_ms)) : undefined;
    const 마감 = Number.isFinite(제한) ? setTimeout(() => 끊기.abort(), 제한) : undefined;
    let 알렸나 = false;
    const 먹기 = (줄: string): void => {
      const 크기 = 컨텍스트크기(줄);
      if (크기 === null) return;
      if (크기 >= 교대토큰) 끊기.abort();
      else if (크기 >= 정리토큰 && !알렸나) {
        알렸나 = true;
        알림('컨텍스트를 곧 다 쓴다(60% 에서 다음 AI 로 바뀐다) — 하던 것을 적고 쪽지(`play:쪽지`)를 고쳐 쓴 뒤 끝낸다(다음 세션이 지도만 보고 잇는다)');
      }
    };
    const 시작 = 지금();
    const 글짓기 = (): string => {
      // 이어 띄운 자식은 컨텍스트가 새것이다
      알림지우기();
      알렸나 = false;
      return 이음 ?? o.프롬프트(거리(Number.isFinite(제한) ? Math.max(1, Math.round((제한 - (지금() - 시작)) / 분)) : 0));
    };
    const r = await o.한번(글짓기, 끊기.signal, 먹기, 이음 !== undefined).finally(() => (clearTimeout(정리때), clearTimeout(마감)));
    상태.쓴ms += 지금() - 시작;
    const 끝으로 = (돌린것 = r.돌린것): { 끝: 띄운결과 } => ({ 끝: { ...r, 돌린것, 앞낸것: r.앞낸것 === null ? [] : [r.앞낸것] } });
    if (!(await o.거두기())) return 끝으로();
    const 올림 = await 배움올리기(o.통로, o.자료, o.비밀);
    못올림 = 올림.못올림;
    상태.열쇠 = [...new Set([...상태.열쇠, ...올림.열쇠])];
    상태쓰기(o.자료, 상태);
    for (const 왜 of 못올림) o.알린다(`게임 학습 — ${왜}`);
    if (r.돌린것.마감으로끊김 !== true && (r.돌린것.코드 === null || 끝낼상태(r.돌린것, false) !== null)) return 끝으로();
    if (o.멈추라했다()) return 끝으로({ ...r.돌린것, 멈춤으로죽음: true });
    앞낸것.push(...(r.앞낸것 === null ? [] : [r.앞낸것]), r.돌린것.낸것);
    // 끝까지 간 세션만 센다 — 끊긴 세션을 세면 이어받았을 때 한 번도 안 배우고 끝난다
    상태.세션 += 1;
    상태쓰기(o.자료, 상태);
    o.알린다(`게임 학습 세션 ${상태.세션} 끝(${r.돌린것.마감으로끊김 === true ? '마감' : '스스로 끝냄'} · 지금까지 ${Math.round(상태.쓴ms / 분)}분) — 지도에 올린 줄 ${올림.열쇠.length}`);
    // 쪽지는 배운 줄이 아니다 — 세션마다 고쳐 쓰는 줄이라 이것까지 세면 「한 줄도 못 배운 세션이 두 번 이어지면 그친다」가 안 걸린다
    const 배운수 = (열쇠들: readonly string[]): number => 열쇠들.filter((k) => k !== 쪽지열쇠).length;
    return { 스스로: r.돌린것.마감으로끊김 !== true, 열쇠수: 배운수(올림.열쇠) + (올림.못올림.length > 0 ? 배운수(적은줄들(안전히읽기(o.자료, 게임자리.배운글, 요소상한)).map((e) => e.key)) : 0) };
  };
  // 글을 지을 때마다 읽는다 — 크레딧이 떨어져 이어 띄운 자식도 방금 적힌 쪽지를 받는다(아직 안 올린 줄도 얹혀 온다)
  const 쪽지 = (): { 쪽지?: string } => {
    const 지도 = 지금지도(o.자료);
    const 글 = 지도 === null ? null : 쪽지글(지도);
    return 글 === null ? {} : { 쪽지: 글 };
  };
  const 트리 = (): { 트리?: string[] } => {
    const 지도 = 부분 ? null : 지금지도(o.자료);
    const 줄 = 지도 === null ? [] : 물음트리(지도, 오늘글(지금()), 빌드);
    return 줄.length === 0 ? {} : { 트리: 줄 };
  };
  // 앞 세션이 해 본 것 · 회고 · 계획을 기계가 모아 쪽지 위에 둔다 — 첫 세션은 모을 것이 없다
  const 인수 = (): { 인수?: string[] } => {
    const 지도 = 상태.세션 === 0 || 부분 ? null : 지금지도(o.자료);
    const 줄 = 지도 === null ? [] : 인수인계(지도, 판기록들(o.자료), 오늘글(지금()), 빌드);
    return 줄.length === 0 ? {} : { 인수: 줄 };
  };
  const 배우기 = (b: 배울것, 틀림?: true, 이음?: string): Promise<세션끝> =>
    배우는중에(o.자료, () => 한세션((남은분) => ({ 배울것: b, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음: !o.쥐었나(), 못올림, 부분, 차례: 상태.세션 + 1, ...(틀림 === undefined ? 트리() : { 틀림 }), ...인수(), ...쪽지(), ...멈춤() }), 틀림 === undefined ? 배움남은 : 시험제한, 이음), 지금());
  /** 계획으로 해 본 수 — 이어 돌린 세션이 해 본 것이 있나 본다 */
  const 해본수 = (): number => 판기록들(o.자료).filter((r) => r.값기록 !== undefined).length;
  const 끝내며 = (끝: 띄운결과): 학습결과 => ({ 끝: { ...끝, 돌린것: 못뜬것은끊김(끝.돌린것, 앞낸것) }, 앞낸것 });

  const 늘리기끄기 = o.늘리기();
  try {
    // 끝은 에이전트가 정한다(2026-11-26 사용자) — 다 배웠거나(열린 물음 0 · 갈 곳마다 가 봄이나 못 가는 까닭) 다섯 번 해 보는 동안 안 늘었을 때.
    // AI 가 그 전에 스스로 끝내면 같은 세션을 이어 돌린다. 컨텍스트 60% 에서 끊긴 세션은 새 세션이 인수인계로 잇는다
    let 이음: string | undefined;
    let 헛이음 = 0;
    let 빈손 = 0;
    for (let b: 배울것 | null = 처음; b !== null && 상태.시험 === undefined && (!부분 || (상태.세션 < 1 && !배울것없나(b) && 배움남은() >= 최소_ms)); b = 볼것()) {
      const 앞판 = 해본수();
      const r = await 배우기(b, undefined, 이음);
      if ('끝' in r) return 끝내며(r.끝);
      if ('못잡음' in r) {
        상태.시험 = '시험을 못 봄(정식 실행에 비켜 준 PC 가 다시 비지 않음)';
        break;
      }
      이음 = undefined;
      if (부분) continue;
      // 컨텍스트로 끊긴 세션이 한 줄도 못 올린 채 이어지면 계획 없이 헛돈다 — 다섯 번 안 늚은 계획으로 해 봐야 센다
      빈손 = r.열쇠수 === 0 ? 빈손 + 1 : 0;
      if (!r.스스로 && 빈손 >= 빈손상한) {
        o.알린다(`게임 학습을 그친다 — 컨텍스트로 끊긴 세션이 ${빈손상한}번 이어 한 줄도 못 배웠다`);
        break;
      }
      if (!r.스스로) continue;
      const 그만 = 안전히읽기(o.자료, 게임자리.그만, 1_000)?.trim();
      if (그만 !== undefined && 그만 !== '') {
        o.알린다(`게임 학습을 끝낸다 — ${그만}`);
        break;
      }
      const 남은것 = 지금지도(o.자료) === null ? [] : 남은배울것(지금지도(o.자료)!, 오늘글(지금()), 빌드);
      if (남은것.length === 0) break;
      헛이음 = 해본수() > 앞판 ? 0 : 헛이음 + 1;
      if (헛이음 >= 헛이음상한) {
        o.알린다(`게임 학습을 그친다 — 스스로 끝낸 세션을 ${헛이음상한}번 이어 돌렸는데 계획으로 해 본 것이 없다(남은 것: ${남은것.join(' · ')})`);
        break;
      }
      o.알린다(`AI 가 스스로 끝냈지만 아직 남았다 — 같은 세션을 이어 돌린다(${남은것.join(' · ')})`);
      이음 = 이음글(남은것);
    }
    if (!부분 && 상태.시험 === undefined) {
      const 틀린 = await 시험보기();
      if ('끝' in 틀린) return 끝내며(틀린.끝);
      // 틀린 줄만 — 나머지 궁금한 것은 다음 작성이 이어 배운다(2026-11-25 사용자)
      if (틀린.열쇠.length > 0) {
        const r = await 배우기({ 빈종류: [], 궁금: 틀린.열쇠, 안잰글: [], 안써봄: [], 빌드다름: [], 게임글: [], 번호: [] }, true);
        if ('끝' in r) return 끝내며(r.끝);
      }
    } else if (부분) 상태.시험 ??= '안 봄(고친 요구에 닿는 줄만 30분 배움)';
    상태.끝 = true;
    상태쓰기(o.자료, 상태);
    return { 앞낸것 };
  } finally {
    알림지우기();
    늘리기끄기();
    await 놓는다();
  }

  /** 시험 세션이 남긴 조작 기록인가 — 앞 학습 세션의 기록 이름을 적으면 해 보지 않은 판이 해 본 것이 된다 */
  function 이번기록인가(이름: string | undefined, 시작: number): boolean {
    // 지켜보기는 가만히 보기만 한 기록이다. 기록은 `.json` 하나다 — 같은 이름으로 남는 끝 화면 · 도중 화면(`.jpg`)을 적으면 안 해 본 판이 해 본 것이 된다
    if (이름 === undefined || /[/\\]/.test(이름) || !이름.endsWith('.json') || /-지켜보기\.json$/.test(이름)) return false;
    const 정보 = lstatSync(join(o.자료, 게임자리.조작기록, 이름), { throwIfNoEntry: false });
    return 정보?.isFile() === true && 정보.mtimeMs >= 시작;
  }

  /** 지도만 본 새 세션 — 첫 판을 끝까지 가 보고, 확인된 줄의 값을 먼저 적고 재서 맞힌다. 틀린 줄은 「덜 봄」으로 내린다 */
  async function 시험보기(): Promise<{ 열쇠: string[] } | { 끝: 띄운결과 }> {
    const 지도 = 지금지도(o.자료);
    if (지도 === null) {
      상태.시험 = '시험을 못 봄(지도를 못 읽음)';
      return { 열쇠: [] };
    }
    const 감들 = 시험감고르기(지도);
    새로쓰기(join(o.자료, 게임자리.시험감), JSON.stringify(감들, null, 1));
    rmSync(join(o.자료, 게임자리.시험답), { force: true });
    const 시험시작 = Date.now();
    const r = await 한세션((남은분) => ({ 시험: true, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음: !o.쥐었나(), ...멈춤() }), 시험제한);
    if ('끝' in r) return r;
    if ('못잡음' in r) {
      상태.시험 = '시험을 못 봄(정식 실행에 비켜 준 PC 가 다시 비지 않음)';
      return { 열쇠: [] };
    }
    const 답 = 시험답읽기(안전히읽기(o.자료, 게임자리.시험답, 요소상한));
    const 점 = 채점하기(감들, 답);
    // 자르기 전에 본다 — 자른 자리에 걸친 비밀번호 앞부분이 공개 PR 에 남지 않게
    if (답.판?.까닭 !== undefined && 계정섞였나([답.판.까닭], o.비밀)) delete 답.판.까닭;
    상태.시험 = 시험줄(점, 답, 이번기록인가(답.판?.기록, 시험시작));
    // 시험 자식이 그 줄을 새로 적었을 수 있다 — 지금 지도의 줄에서 믿음만 내린다
    const 내릴 = (지금지도(o.자료)?.줄들 ?? []).flatMap((x) => (점.틀림.includes(x.key) && x.learned !== null ? [{ kind: x.kind, key: x.key, name: x.name, learned: { ...x.learned, belief: 'SEEN' as const } }] : []));
    if (내릴.length > 0) {
      const 적은 = 적은줄들(안전히읽기(o.자료, 게임자리.배운글, 요소상한)).filter((e) => !점.틀림.includes(e.key));
      새로쓰기(join(o.자료, 게임자리.배운글), JSON.stringify({ elements: [...적은, ...내릴] }));
      못올림 = (await 배움올리기(o.통로, o.자료, o.비밀)).못올림;
    }
    상태쓰기(o.자료, 상태);
    o.알린다(`게임 학습 시험 — ${상태.시험}`);
    return { 열쇠: 점.틀림 };
  }
}

export { 이음글, 학습번호들, type 학습대상 } from './authoring-learn-tail.js';
