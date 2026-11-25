// 게임 배우기 — 케이스를 쓰기 전에 학습 세션을 30분씩 띄워 게임을 배우고, 지도만 본 새 세션이 시험을 본다 (도메인/게임 §3.10 「게임 배우기」 · GAME-F6-03)
// 세션끼리는 대화를 넘기지 않는다 — 세션이 끝날 때마다 배운 줄을 올리고 지도를 다시 받아 다음 세션이 지도만 이어받는다
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { type 띄운결과, 맵올리기 } from './authoring-explore.js';
import { 게임자리, 글받기, 요소상한 } from './authoring-game.js';
import { 적은줄들, 지금지도 } from './authoring-game-find.js';
import { type 돌린결과, 부른다 } from './authoring-io.js';
import { 시험감고르기, 시험답읽기, 시험줄, 채점하기 } from './authoring-learn-exam.js';
import { type 배울것, 글자들, 배울것고르기, 배울것없나, 사람줄 } from './authoring-learn-map.js';
import { 끝낼상태 } from './authoring-progress.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';
import { 컨텍스트크기 } from './authoring-usage.js';

const 분 = 60_000;
// 2026-11-25 사용자가 정한 첫 값 — 실측(GAME-F6-05)에서 고친다
const 세션_ms = 30 * 분;
const 최대세션 = 4;
const 정리토큰 = 180_000;
const 교대토큰 = 200_000;
/** 마감 앞 정리하라고 알리는 때 */
const 정리앞_ms = 5 * 분;
/** 이보다 적게 남았으면 세션을 새로 띄우지 않는다 — 게임을 켜고 그 자리까지 가는 데만 몇 분이다 */
const 최소_ms = 10 * 분;

/** 에이전트가 자료 폴더에 남기는 기록 — 이어받은 실행이 쓴 시간을 잇고, 끝났으면 건너뛴다 */
interface 학습상태 {
  쓴ms: number;
  세션: number;
  끝: boolean;
  안함?: string;
  시험?: string;
  /** 이번 작성이 올린 열쇠 — PR 머리의 사람이 볼 줄은 이 가운데서만 싣는다 */
  열쇠: string[];
}

function 상태읽기(자료: string): 학습상태 {
  const 없음: 학습상태 = { 쓴ms: 0, 세션: 0, 끝: false, 열쇠: [] };
  try {
    const 몸 = JSON.parse(안전히읽기(자료, 게임자리.학습, 1_000_000) ?? 'null') as Partial<학습상태> | null;
    if (몸 === null) return 없음;
    const 수 = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
    return {
      쓴ms: 수(몸.쓴ms),
      세션: 수(몸.세션),
      끝: 몸.끝 === true,
      ...(typeof 몸.안함 === 'string' ? { 안함: 몸.안함 } : {}),
      ...(typeof 몸.시험 === 'string' ? { 시험: 몸.시험 } : {}),
      열쇠: Array.isArray(몸.열쇠) ? 몸.열쇠.filter((k): k is string => typeof k === 'string') : [],
    };
  } catch {
    return 없음;
  }
}
const 상태쓰기 = (자료: string, 상태: 학습상태): void => 새로쓰기(join(자료, 게임자리.학습), JSON.stringify(상태));

/**
 * 적은 줄을 서버 지도에 올리고 지도 글을 다시 받는다. 다시 받기까지 되어야 적은 파일을 지운다 — 먼저 지우면 다음 세션의 지도에서 이번 줄이 사라진다.
 * 조작 맵에 적은 행도 같이 올린다. 못 올려도 다음 세션은 적은 파일을 얹어 본다
 */
export async function 배움올리기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<{ 열쇠: string[]; 못올림: string[] }> {
  const 맵 = await 맵올리기(통로, 자료, 비밀);
  const 못올림 = 맵.틀림 === null ? [] : [맵.틀림];
  const 글 = 안전히읽기(자료, 게임자리.배운글, 요소상한);
  if (글 === null) return { 열쇠: [], 못올림: existsSync(join(자료, 게임자리.배운글)) ? [...못올림, `${게임자리.배운글} 이 4MB 를 넘거나 일반 파일이 아니다`] : 못올림 };
  const elements = 적은줄들(글);
  if (elements.length === 0) return { 열쇠: [], 못올림 };
  if (계정섞였나(글자들(elements), 비밀)) return { 열쇠: [], 못올림: [...못올림, '배운 줄에 테스트 계정 비밀번호가 들어 있다'] };
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${통로.번호}/game-elements`, { method: 'PUT', body: { elements } });
    if (답.status !== 204) {
      const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
      return { 열쇠: [], 못올림: [...못올림, `배운 줄을 서버가 안 받았다(${답.status}${typeof 자리 === 'string' ? ` ${자리.slice(0, 100)}` : ''})`] };
    }
  } catch (e) {
    return { 열쇠: [], 못올림: [...못올림, `배운 줄을 못 올렸다 — ${e instanceof Error ? e.message : String(e)}`] };
  }
  const 왜 = await 글받기(통로, 자료, 'game-map', 게임자리.지도);
  if (왜 === null) rmSync(join(자료, 게임자리.배운글), { force: true });
  return { 열쇠: elements.map((e) => e.key), 못올림: 왜 === null ? 못올림 : [...못올림, `올린 뒤 지도를 다시 못 받았다 — ${왜}`] };
}

type 한번결과 = { 돌린것: 돌린결과; 크레딧으로: boolean; 앞낸것: string | null };

/** 세션 하나에 주는 재료 — 프롬프트는 부르는 쪽이 짓는다(authoring-learn-prompt) */
export type 세션거리 =
  | { 시험: true; 남은분: number; 빌드?: string; 놓음: boolean }
  | { 시험?: undefined; 배울것: 배울것; 남은분: number; 빌드?: string; 놓음: boolean; 못올림: string[]; 부분: boolean; 차례: number };

export interface 학습손 {
  통로: 화면통로;
  자료: string;
  비밀: readonly string[];
  /** 이어 작성 · 반영이면 맡은 요구 번호 — 그 요구에 닿는 줄만 30분 한 세션 */
  번호들?: readonly string[];
  /** 디바이스를 잡을 길이 없으면 까닭 — 학습을 안 한다 */
  못함: string | null;
  빌드: () => Promise<string | undefined>;
  프롬프트: (거리: 세션거리) => string;
  한번: (글: string, 끊기: AbortSignal, 먹기: (줄: string) => void) => Promise<한번결과>;
  /** 앞 자식이 남긴 프로세스를 거둔다 — 디바이스는 쥔 채다 */
  거두기: () => Promise<boolean>;
  늘리기: () => () => void;
  놓기: () => Promise<void>;
  /** 디바이스를 기다리는 정식 실행이 있나 — 있으면 세션 경계에서 놓는다 */
  양보: () => Promise<boolean>;
  멈추라했다: () => boolean;
  알린다: (글: string) => void;
  지금?: () => number;
}

export interface 학습결과 {
  /** 있으면 작성을 이것으로 끝낸다(사람 멈춤 · 끊김 · 못 띄움) — 폴더가 남아 이어하기가 학습부터 잇는다 */
  끝?: 띄운결과;
  /** 학습 자식들의 출력 — 토큰을 다 더해 알린다 */
  앞낸것: string[];
}

/** 한국 날짜 — 「다음 날 볼 것」의 날과 견준다 */
const 오늘글 = (지금: number): string => new Date(지금).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

export async function 학습하기(o: 학습손): Promise<학습결과> {
  const 앞낸것: string[] = [];
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
  const 볼것 = (): 배울것 | null => {
    const 지도 = 지금지도(o.자료);
    return 지도 === null ? null : 배울것고르기(지도, { ...(빌드 === undefined ? {} : { 빌드 }), 오늘: 오늘글(지금()), 게임글: 안전히읽기(o.자료, 게임자리.게임글, 요소상한), ...(o.번호들 === undefined ? {} : { 번호들: o.번호들 }) });
  };
  const 처음 = 볼것();
  if (처음 === null) return 건너뛴다('게임 지도를 못 받았다', true);
  if (상태.세션 === 0 && 배울것없나(처음)) return 건너뛴다('배울 것이 없다(빈 종류 · 궁금한 것 · 다시 볼 빌드가 없다)', false);

  const 부분 = o.번호들 !== undefined;
  const 총 = 부분 ? 세션_ms : 최대세션 * 세션_ms;
  let 못올림: string[] = [];
  let 놓음 = true;
  const 남은 = (): number => 총 - 상태.쓴ms;

  /** 세션 하나 — 마감 · 컨텍스트에서 끊고, 적은 줄을 올린다. 작성을 끝내야 하면 띄운결과 */
  const 한세션 = async (거리: (남은분: number) => 세션거리): Promise<{ 열쇠수: number } | { 끝: 띄운결과 }> => {
    const 제한 = Math.min(세션_ms, 남은());
    rmSync(join(o.자료, 게임자리.학습알림), { force: true });
    const 알림 = (글: string): void => {
      try {
        새로쓰기(join(o.자료, 게임자리.학습알림), 글);
      } catch (e) {
        o.알린다(`정리하라는 알림을 못 남겼다 — ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    const 끊기 = new AbortController();
    const 정리때 = setTimeout(() => 알림('세션 끝까지 5분 남았다 — 하던 것을 적고 정리한 뒤 끝낸다'), Math.max(0, 제한 - 정리앞_ms));
    const 마감 = setTimeout(() => 끊기.abort(), 제한);
    let 알렸나 = false;
    const 먹기 = (줄: string): void => {
      const 크기 = 컨텍스트크기(줄);
      if (크기 === null) return;
      if (크기 >= 교대토큰) 끊기.abort();
      else if (크기 >= 정리토큰 && !알렸나) {
        알렸나 = true;
        알림('컨텍스트가 거의 찼다 — 하던 것을 적고 정리한 뒤 끝낸다(다음 세션이 지도만 보고 잇는다)');
      }
    };
    상태.세션 += 1;
    상태쓰기(o.자료, 상태);
    const 시작 = 지금();
    const r = await o.한번(o.프롬프트(거리(Math.round(제한 / 분))), 끊기.signal, 먹기).finally(() => (clearTimeout(정리때), clearTimeout(마감)));
    상태.쓴ms += 지금() - 시작;
    놓음 = false;
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
    o.알린다(`게임 학습 세션 ${상태.세션} 끝(${r.돌린것.마감으로끊김 === true ? '마감' : '스스로 끝냄'} · 지금까지 ${Math.round(상태.쓴ms / 분)}분) — 지도에 올린 줄 ${올림.열쇠.length}`);
    if (남은() >= 최소_ms && (await o.양보())) {
      o.알린다('디바이스를 기다리는 정식 실행이 있어 놓는다 — 다음 세션이 다시 잡아 배운 조작 도우미로 잇는다');
      await o.놓기();
      놓음 = true;
    }
    return { 열쇠수: 올림.열쇠.length + (올림.못올림.length > 0 ? 적은줄들(안전히읽기(o.자료, 게임자리.배운글, 요소상한)).length : 0) };
  };
  const 배우기 = (b: 배울것) => 한세션((남은분) => ({ 배울것: b, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음, 못올림, 부분, 차례: 상태.세션 }));

  const 늘리기끄기 = o.늘리기();
  try {
    for (let b: 배울것 | null = 처음; b !== null && !배울것없나(b) && 상태.세션 < (부분 ? 1 : 최대세션 - 1) && 남은() >= 최소_ms; b = 볼것()) {
      const r = await 배우기(b);
      if ('끝' in r) return { 끝: r.끝, 앞낸것 };
      // 한 줄도 안 적은 세션 뒤에 같은 것을 또 띄우면 헛돈다
      if (r.열쇠수 === 0) break;
    }
    if (!부분 && 상태.시험 === undefined) {
      const 틀린 = await 시험보기();
      if ('끝' in 틀린) return { 끝: 틀린.끝, 앞낸것 };
      const b = 볼것();
      if (틀린.열쇠.length > 0 && b !== null && 상태.세션 < 최대세션 && 남은() >= 최소_ms) {
        const r = await 배우기({ ...b, 궁금: [...new Set([...틀린.열쇠, ...b.궁금])] });
        if ('끝' in r) return { 끝: r.끝, 앞낸것 };
      }
    } else if (부분) 상태.시험 ??= '안 봄(고친 요구에 닿는 줄만 30분 배움)';
    상태.끝 = true;
    상태쓰기(o.자료, 상태);
    return { 앞낸것 };
  } finally {
    늘리기끄기();
    await o.놓기();
  }

  /** 지도만 본 새 세션 — 첫 판을 끝까지 가 보고, 확인된 줄의 값을 먼저 적고 재서 맞힌다. 틀린 줄은 「덜 봄」으로 내린다 */
  async function 시험보기(): Promise<{ 열쇠: string[] } | { 끝: 띄운결과 }> {
    const 지도 = 지금지도(o.자료);
    if (지도 === null || 남은() < 최소_ms || 상태.세션 >= 최대세션) {
      상태.시험 = '시험을 못 봄(배우는 데 시간을 다 씀)';
      return { 열쇠: [] };
    }
    const 감들 = 시험감고르기(지도);
    새로쓰기(join(o.자료, 게임자리.시험감), JSON.stringify(감들, null, 1));
    rmSync(join(o.자료, 게임자리.시험답), { force: true });
    const r = await 한세션((남은분) => ({ 시험: true, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음 }));
    if ('끝' in r) return r;
    const 답 = 시험답읽기(안전히읽기(o.자료, 게임자리.시험답, 요소상한));
    const 점 = 채점하기(감들, 답);
    const 기록이름 = 답.판?.기록 ?? '';
    const 기록 = 기록이름 !== '' && !/[/\\]/.test(기록이름) && existsSync(join(o.자료, 게임자리.조작기록, 기록이름));
    상태.시험 = 시험줄(점, 답, 기록);
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

/** 작성 끝에 PR 머리에 싣는 줄 — 못 올린 배운 줄을 한 번 더 올리고, 시험 성적 · 버그 후보 · 사람에게 물을 것만 적는다. 배우지 않은 작성이면 빈 목록 */
export async function 학습끝줄(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string[]> {
  const 상태 = 상태읽기(자료);
  if (상태.세션 === 0) return 상태.안함 === undefined ? [] : [`게임 학습: 안 함 — ${상태.안함}`];
  const 올림 = 안전히읽기(자료, 게임자리.배운글, 요소상한) === null ? { 열쇠: [], 못올림: [] } : await 배움올리기(통로, 자료, 비밀);
  const 지도 = 지금지도(자료);
  return [
    `게임 학습: 세션 ${상태.세션}번 · ${Math.round(상태.쓴ms / 분)}분 — 시험: ${상태.시험 ?? '못 봄'}`,
    ...올림.못올림.map((왜) => `게임 학습: ${왜}`),
    ...(지도 === null ? [] : 사람줄(지도, new Set([...상태.열쇠, ...올림.열쇠]), 비밀)),
  ].map((줄) => (계정섞였나([줄], 비밀) ? `${줄.split(':')[0]!}: 테스트 계정 비밀번호가 들어 있어 안 적음` : 줄));
}

export interface 학습대상 {
  반영?: { 다시씀: readonly { 번호: string }[]; 새항목: readonly string[] };
  이어작성?: { 남은: readonly string[] };
}

/** 이어 작성 · 반영이 맡은 요구 번호 — 첫 작성 · 대조 · 화면만은 undefined(전체를 배운다) */
export const 학습번호들 = (x: 학습대상): string[] | undefined =>
  x.반영 !== undefined ? [...x.반영.다시씀.map((y) => y.번호), ...x.반영.새항목] : x.이어작성 !== undefined ? [...x.이어작성.남은] : undefined;
