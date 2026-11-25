// 게임 배우기 — 케이스를 쓰기 전에 학습 세션을 30분씩 띄워 게임을 배우고, 지도만 본 새 세션이 시험을 본다 (도메인/게임 §3.10 「게임 배우기」 · GAME-F6-03)
// 세션끼리는 대화를 넘기지 않는다 — 세션이 끝날 때마다 배운 줄을 올리고 지도를 다시 받아 다음 세션이 지도만 이어받는다
import { lstatSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { 띄운결과 } from './authoring-explore.js';
import { 게임자리, 요소상한 } from './authoring-game.js';
import { 적은줄들, 지금지도 } from './authoring-game-find.js';
import type { 돌린결과 } from './authoring-io.js';
import { 시험감고르기, 시험답읽기, 시험줄, 채점하기 } from './authoring-learn-exam.js';
import { 배움올리기, 상태쓰기, 상태읽기 } from './authoring-learn-io.js';
import { type 배울것, 배울것고르기, 배울것없나 } from './authoring-learn-map.js';
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

type 한번결과 = { 돌린것: 돌린결과; 크레딧으로: boolean; 앞낸것: string | null };

/** 세션 하나에 주는 재료 — 프롬프트는 부르는 쪽이 짓는다(authoring-learn-prompt) */
export type 세션거리 =
  | { 시험: true; 남은분: number; 빌드?: string; 놓음: boolean }
  /** 틀림 — 시험에서 틀린 줄만 다시 배운다 */
  | { 시험?: undefined; 배울것: 배울것; 남은분: number; 빌드?: string; 놓음: boolean; 못올림: string[]; 부분: boolean; 차례: number; 틀림?: true };

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
  /** 글은 띄울 때마다 짓는다 — 크레딧이 도중에 떨어져 구독으로 이어 띄우면 쥔 디바이스 · 남은 시간이 첫 자식 때와 다르다 */
  한번: (글짓기: () => string, 끊기: AbortSignal, 먹기: (줄: string) => void) => Promise<한번결과>;
  /** 앞 자식이 남긴 프로세스를 거둔다 — 디바이스는 쥔 채다 */
  거두기: () => Promise<boolean>;
  늘리기: () => () => void;
  /** 지금 디바이스를 쥐고 있나(잡기 기록) */
  쥐었나: () => boolean;
  놓기: () => Promise<void>;
  /** 디바이스를 기다리는 정식 실행이 있나 — 있으면 다음 세션 앞에서 놓는다 */
  양보: () => Promise<boolean>;
  /** 비켜 준 뒤 다시 빌 때까지 기다린다 — 거짓이면 안 비었다 */
  빈것기다리기: () => Promise<boolean>;
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

/** 앞에 돈 학습 자식이 있는데 다음 자식이 못 떴다 — 실패로 끝내면 배운 폴더와 토큰을 잃어 끊김(코드 1)으로 바꾼다(탐색 세션과 같다) */
export const 못뜬것은끊김 = (돌린것: 돌린결과, 앞낸것: readonly string[]): 돌린결과 =>
  앞낸것.length > 0 && 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음 ? { ...돌린것, 코드: 1 } : 돌린것;

export async function 학습하기(o: 학습손): Promise<학습결과> {
  const 앞낸것: string[] = [];
  // 앞 실행이 남긴 「정리하라」 알림이 케이스를 쓰는 세션의 찾기 명령에 찍히지 않게 — 배우지 않는 길에서도 지운다
  const 알림지우기 = (): void => rmSync(join(o.자료, 게임자리.학습알림), { force: true });
  알림지우기();
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
  if (상태.쓴ms === 0 && 배울것없나(처음)) return 건너뛴다('배울 것이 없다(안 잰 칸 · 빈 종류 · 궁금한 것 · 다시 볼 빌드가 없다)', false);

  const 부분 = o.번호들 !== undefined;
  const 총 = 부분 ? 세션_ms : 최대세션 * 세션_ms;
  let 못올림: string[] = [];
  const 남은 = (): number => 총 - 상태.쓴ms;

  type 세션끝 = { 열쇠수: number } | { 끝: 띄운결과 } | { 못잡음: true };

  /** 세션 하나 — 마감 · 컨텍스트에서 끊고, 적은 줄을 올린다. 작성을 끝내야 하면 띄운결과 */
  const 한세션 = async (거리: (남은분: number) => 세션거리): Promise<세션끝> => {
    // 다음 세션을 띄울 때만 묻는다 — 다 배웠으면 어차피 놓는다. 기다린 시간은 배운 시간에 안 넣는다
    if (앞낸것.length > 0 && o.쥐었나() && (await o.양보())) {
      o.알린다('PC 를 기다리는 정식 실행이 있어 비켜 준다 — 다시 비면 배운 조작 도우미로 그 자리까지 가서 잇는다');
      await o.놓기();
      const 비었나 = await o.빈것기다리기();
      if (o.멈추라했다()) return { 끝: { 돌린것: { 코드: null, 낸것: '', 오류: '', 시간초과: false, 멈춤으로죽음: true }, 크레딧으로: false, 앞낸것: [] } };
      if (!비었나) return { 못잡음: true };
    }
    const 제한 = Math.min(세션_ms, 남은());
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
    const 시작 = 지금();
    const 글짓기 = (): string => {
      // 이어 띄운 자식은 컨텍스트가 새것이다
      알림지우기();
      알렸나 = false;
      return o.프롬프트(거리(Math.max(1, Math.round((제한 - (지금() - 시작)) / 분))));
    };
    const r = await o.한번(글짓기, 끊기.signal, 먹기).finally(() => (clearTimeout(정리때), clearTimeout(마감)));
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
    return { 열쇠수: 올림.열쇠.length + (올림.못올림.length > 0 ? 적은줄들(안전히읽기(o.자료, 게임자리.배운글, 요소상한)).length : 0) };
  };
  const 배우기 = (b: 배울것, 틀림?: true) => 한세션((남은분) => ({ 배울것: b, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음: !o.쥐었나(), 못올림, 부분, 차례: 상태.세션 + 1, ...(틀림 === undefined ? {} : { 틀림 }) }));
  const 끝내며 = (끝: 띄운결과): 학습결과 => ({ 끝: { ...끝, 돌린것: 못뜬것은끊김(끝.돌린것, 앞낸것) }, 앞낸것 });

  const 늘리기끄기 = o.늘리기();
  try {
    for (let b: 배울것 | null = 처음; b !== null && !배울것없나(b) && 상태.세션 < (부분 ? 1 : 최대세션 - 1) && 남은() >= 최소_ms; b = 볼것()) {
      const r = await 배우기(b);
      if ('끝' in r) return 끝내며(r.끝);
      if ('못잡음' in r) {
        상태.시험 = '시험을 못 봄(정식 실행에 비켜 준 PC 가 다시 비지 않음)';
        break;
      }
      // 한 줄도 안 적은 세션 뒤에 같은 것을 또 띄우면 헛돈다
      if (r.열쇠수 === 0) break;
    }
    if (!부분 && 상태.시험 === undefined) {
      const 틀린 = await 시험보기();
      if ('끝' in 틀린) return 끝내며(틀린.끝);
      // 틀린 줄만 — 나머지 궁금한 것은 다음 작성이 이어 배운다(2026-11-25 사용자)
      if (틀린.열쇠.length > 0 && 상태.세션 < 최대세션 && 남은() >= 최소_ms) {
        const r = await 배우기({ 칸: [], 빈종류: [], 궁금: 틀린.열쇠, 빌드다름: [], 게임글: [], 번호: [] }, true);
        if ('끝' in r) return 끝내며(r.끝);
      }
    } else if (부분) 상태.시험 ??= '안 봄(고친 요구에 닿는 줄만 30분 배움)';
    상태.끝 = true;
    상태쓰기(o.자료, 상태);
    return { 앞낸것 };
  } finally {
    알림지우기();
    늘리기끄기();
    await o.놓기();
  }

  /** 시험 세션이 남긴 조작 기록인가 — 앞 학습 세션의 기록 이름을 적으면 해 보지 않은 판이 해 본 것이 된다 */
  function 이번기록인가(이름: string | undefined, 시작: number): boolean {
    if (이름 === undefined || /[/\\]/.test(이름)) return false;
    const 정보 = lstatSync(join(o.자료, 게임자리.조작기록, 이름), { throwIfNoEntry: false });
    return 정보?.isFile() === true && 정보.mtimeMs >= 시작;
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
    const 시험시작 = Date.now();
    const r = await 한세션((남은분) => ({ 시험: true, 남은분, ...(빌드 === undefined ? {} : { 빌드 }), 놓음: !o.쥐었나() }));
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

export interface 학습대상 {
  반영?: { 다시씀: readonly { 번호: string }[]; 새항목: readonly string[] };
  이어작성?: { 남은: readonly string[] };
}

/** 이어 작성 · 반영이 맡은 요구 번호 — 첫 작성 · 대조 · 화면만은 undefined(전체를 배운다) */
export const 학습번호들 = (x: 학습대상): string[] | undefined =>
  x.반영 !== undefined ? [...x.반영.다시씀.map((y) => y.번호), ...x.반영.새항목] : x.이어작성 !== undefined ? [...x.이어작성.남은] : undefined;
