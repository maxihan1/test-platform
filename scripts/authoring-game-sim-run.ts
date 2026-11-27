// 시뮬레이션 돌리기 — 정책 후보 × 문턱 조합을 다 돌려 이기는 안을 고르고, 손 시간은 새 판 행동기록에서 재고, 걷는 거리는 격자 길찾기로 낸다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 계산기(authoring-game-calc.ts 의 `시뮬`)와 게이트(authoring-learn-sim.ts)가 같이 쓴다
import { createHash } from 'node:crypto';

import { 곳격자, 길내기, 맨쌍글 } from './authoring-game-path.js';
import { type 모델, type 규칙, type 점, 문턱넣기 } from './authoring-game-sim-input.js';
import { type 걷는거리, type 시뮬결과, type 행동, 돌리기, 엔진판, 원안길이 } from './authoring-game-sim.js';
import { 지금지도 } from './authoring-game-find.js';
import { type 판기록, 판기록들 } from './authoring-learn-check.js';
import { 놀이시작뒤 } from './authoring-learn-io.js';
import { 계획곳 } from './authoring-learn-play.js';

/** 문턱 조합을 이만큼 넘게 돌리지 않는다 — 후보를 줄여 달라고 알린다 */
export const 조합상한 = 400;
/** 고른 안의 문턱을 이웃 후보로 하나씩 바꿔도 이기는 비율 — 이보다 낮으면 「여유 없음」으로 알린다 */
export const 여유기준 = 0.5;
/** 새 판이 없을 때 행동 하나에 드는 초 — 지침 「한 바퀴는 0.5초 안에」 */
export const 행동초첫값 = 0.5;

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 판 함수가 돌려준 행동기록 — 값.행동기록 [{ 초, 행동, 대상?, 자리?, 도착초?, 끝초? }]. 틀린 항목은 버린다 */
export function 행동기록읽기(r: 판기록): 행동[] | null {
  const 들 = 객체(r.값).행동기록;
  if (!Array.isArray(들)) return null;
  return 들.flatMap((v) => {
    const x = 객체(v);
    if (!수(x.초) || typeof x.행동 !== 'string') return [];
    const 자 = Array.isArray(x.자리) && x.자리.length >= 2 && 수(x.자리[0]) && 수(x.자리.at(-1)) ? ([x.자리[0], x.자리.at(-1)] as 점) : undefined;
    return [{ 초: x.초, 행동: x.행동, ...(typeof x.대상 === 'string' ? { 대상: x.대상 } : {}), ...(자 === undefined ? {} : { 자리: 자 }), ...(수(x.도착초) ? { 도착초: x.도착초 } : {}), ...(수(x.끝초) ? { 끝초: x.끝초 } : {}) }];
  });
}

/**
 * 손 — 그 곳을 적은 계획으로 해 본 새 판(놀이시작 뒤) 가운데 행동기록이 있는 가장 새 판에서 행동 하나에 든 초(도착부터 끝까지)의 가운데 값.
 * 지난 판의 바퀴 시간표는 안 쓴다(2026-11-28 사용자 — 정책을 받은 판 함수는 읽고 쉬는 시간이 없다)
 */
export function 손재기(자료: string, 곳: string): { 행동초: number; 기록?: string } {
  const 지도 = 지금지도(자료);
  if (지도 === null) return { 행동초: 행동초첫값 };
  const 판 = [...놀이시작뒤(자료, 판기록들(자료))].reverse().find((r) => r.값기록 !== undefined && 계획곳(지도.줄들, r.값기록.계획) === 곳 && (행동기록읽기(r)?.length ?? 0) > 0);
  const 초들 = (판 === undefined ? [] : 행동기록읽기(판)!).flatMap((x) => (x.끝초 === undefined ? [] : [x.끝초 - (x.도착초 ?? x.초)])).filter((v) => v >= 0).sort((a, b) => a - b);
  return 초들.length === 0 ? { 행동초: 행동초첫값 } : { 행동초: 초들[Math.floor(초들.length / 2)]!, 기록: 판!.이름 };
}

/** 격자 길찾기로 걷는 거리 — 칸 쌍마다 한 번만 찾는다. 격자를 못 지으면 곧은 거리 */
export function 격자걷기(자료: string, m: 모델): { 걷기: 걷는거리; 글: string } {
  const 덧: 점[] = [m.지킬것.자리, m.캐릭터.자리, ...m.자리후보, ...Object.values(m.길).flat()];
  const g = 곳격자(자료, m.곳, 덧);
  const 곧은: 걷는거리 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (typeof g === 'string') return { 걷기: 곧은, 글: `격자를 못 지어 곧은 거리로 걸었다 — ${g}` };
  const 표 = new Map<string, number>();
  return {
    글: ['걷는 거리는 격자 길찾기', ...맨쌍글(g)].join(' · '),
    걷기: (a, b) => {
      const 열쇠 = `${Math.floor(a[0])},${Math.floor(a[1])}>${Math.floor(b[0])},${Math.floor(b[1])}`;
      let d = 표.get(열쇠);
      if (d === undefined) {
        const r = 길내기(g, a, b);
        d = '길이' in r ? r.길이 : 곧은(a, b) * 3;
        표.set(열쇠, d);
      }
      return d;
    },
  };
}

function 조합들(후보: Readonly<Record<string, number[]>>): Record<string, number>[] {
  return Object.entries(후보).reduce<Record<string, number>[]>((들, [k, 값들]) => 들.flatMap((x) => 값들.map((v) => ({ ...x, [k]: v }))), [{}]);
}

export interface 찾은안 { 정책번호: number; 문턱: Record<string, number>; 정책: 규칙[]; 결과: 시뮬결과; 여유: number }
export interface 찾기결과 { 가장: 찾은안 | null; 가장멀리: 찾은안; 이긴수: number; 전체: number }

/** 정책 후보마다 문턱 조합을 다 돌린다 — 이긴 것 가운데 마지막 지킬것이 가장 많이 남는 안, 못 이겼으면 가장 멀리 간 안 */
export function 찾기(m: 모델, 걷기?: 걷는거리): 찾기결과 | { 틀림: string } {
  const 조합 = 조합들(m.문턱후보);
  const 전체 = 조합.length * m.정책들.length;
  if (전체 > 조합상한) return { 틀림: `정책 ${m.정책들.length} × 문턱 조합 ${조합.length} = ${전체} 번은 너무 많다(${조합상한} 번까지) — 문턱후보를 줄인다` };
  const 점수 = (r: 시뮬결과): number => (r.이김 ? 1e9 + (r.웨이브.at(-1)?.끝지킬것 ?? 0) * 1e3 + (r.웨이브.at(-1)?.끝재화 ?? 0) : r.웨이브.length * 1e6 + (r.짐?.초 ?? 0));
  let 가장: 찾은안 | null = null;
  let 멀리: 찾은안 | null = null;
  let 이긴수 = 0;
  const 결과표 = new Map<string, boolean>();
  for (const [i, 정책] of m.정책들.entries()) {
    for (const 문턱 of 조합) {
      const 넣은 = 문턱넣기(정책, 문턱);
      const 결과 = 돌리기(m, 넣은, 걷기);
      결과표.set(`${i}:${JSON.stringify(문턱)}`, 결과.이김);
      const 안 = { 정책번호: i, 문턱, 정책: 넣은, 결과, 여유: 0 };
      if (결과.이김) {
        이긴수 += 1;
        if (가장 === null || 점수(결과) > 점수(가장.결과)) 가장 = 안;
      }
      if (멀리 === null || 점수(결과) > 점수(멀리.결과)) 멀리 = 안;
    }
  }
  if (가장 !== null) {
    // 여유 — 문턱 하나씩 이웃 후보로 바꾼 조합이 얼마나 이기나. 손이 조금 늦거나 값이 조금 달라도 이기는 안인지 본다
    const g = 가장;
    const 이웃 = Object.entries(m.문턱후보).flatMap(([k, 값들]) => { const j = 값들.indexOf(g.문턱[k]!); return [값들[j - 1], 값들[j + 1]].filter((v): v is number => v !== undefined).map((v) => ({ ...g.문턱, [k]: v })); });
    g.여유 = 이웃.length === 0 ? 1 : 이웃.filter((x) => 결과표.get(`${g.정책번호}:${JSON.stringify(x)}`) === true).length / 이웃.length;
  }
  return { 가장, 가장멀리: 멀리!, 이긴수, 전체 };
}

/** 설치물 종류마다 놓기 자리 차례 — 엔진이 놓기에서 고르는 것과 같은 순서(첫 레벨 사거리로 길을 많이 덮는 자리부터). 판 함수가 빈 자리 가운데 앞의 것에 놓는다 */
export const 자리차례 = (m: 모델): Record<string, 점[]> =>
  Object.fromEntries(Object.values(m.설치물종류).map((t) => [t.이름, [...m.자리후보].sort((a, b) => Object.values(m.길).reduce((합, 길) => 합 + 원안길이(길, { 중심: b, 반지름: t.레벨[0]!.사거리 }) - 원안길이(길, { 중심: a, 반지름: t.레벨[0]!.사거리 }), 0))]));

/** 입력 파일 해시 — 게이트가 시뮬 줄을 낸 뒤 입력이 바뀌었나 본다 */
export const 해시 = (글: string): string => createHash('sha256').update(글).digest('hex').slice(0, 16);

const 웨이브글 = (r: 시뮬결과): string[] => r.웨이브.map((w) => `  ${w.이름} 처치 ${w.처치} · 새어 나감 ${w.새어나감} · 끝 지킬것 ${w.끝지킬것} · 끝 재화 ${w.끝재화} · ${w.끝초}초`);
export const 짐글 = (r: Pick<시뮬결과, '짐'>): string => (r.짐 === undefined ? '' : r.짐.시간넘음 === true ? `${r.짐.웨이브} 에서 ${r.짐.초}초가 넘도록 안 끝남` : `${r.짐.웨이브} ${r.짐.초}초에 지킬것 0 · 그 웨이브에서 새어 나간 적의 남은 체력 ${r.짐.새어나간체력} · 쥔 재화 ${r.짐.쥔재화}`);

/**
 * 계산기의 `시뮬` — 입력 파일이 `<자료 폴더>/game-calc/<이름>.json` 이면 손 시간 · 격자 · 재현 기록을 그 자료 폴더에서 읽는다.
 * 결과는 CALC 줄 data 에 그대로 실리니 판마다 늘어나는 예상 · 행동기록은 안 싣는다(게이트가 다시 돌려 얻는다)
 */
export function 시뮬계산(모델: 모델, 자료: string | undefined, 파일글: string, 파일: string): { 글: string; 줄글: string[]; 결과: Record<string, unknown>; 입력요약: Record<string, unknown> } | { 틀림: string } {
  // 유지 값은 판 · 지도 규칙에서 잰 값이어야 한다 — 근거 줄이 지도에 있나 본다(16102 는 지침 예시 숫자를 베껴 깬 맵까지 이기는 안이 없다고 냈다)
  const 지도 = 자료 === undefined ? null : 지금지도(자료);
  const 없는근거 = 지도 === null ? [] : Object.values(모델.설치물종류).flatMap((t) => (t.유지 === undefined || 지도.줄들.some((x) => x.key === t.유지!.근거 && x.learned !== null) ? [] : [t.유지.근거]));
  if (없는근거.length > 0) return { 틀림: `유지 근거 ${없는근거.join(' · ')} 가 지도에 없다 — 유지 값은 그 게임에서 잰 값이고, 잰 지도 줄 열쇠를 근거로 적는다(지침 예시 숫자를 쓰지 않는다)` };
  const 잰 = 자료 === undefined ? { 행동초: 행동초첫값 } : 손재기(자료, 모델.곳);
  // 지어낸 빠른 손을 막는다 — 잰 값보다 빠르게 적었으면 잰 값
  const m: 모델 = { ...모델, 손: { 행동초: Math.max(모델.손.행동초, 잰.행동초) } };
  const 걸음 = 자료 === undefined ? { 걷기: undefined, 글: '자료 폴더 밖 입력이라 곧은 거리로 걸었다' } : 격자걷기(자료, m);
  let 재현: { 기록: string; 이김: boolean; 웨이브수: number; 짐?: 시뮬결과['짐'] } | undefined;
  const 줄글: string[] = [...(자료 === undefined ? ['이 입력은 <자료 폴더>/game-calc/ 밖에 있다 — 이 줄로는 판이 안 돈다(조작 도우미가 그 자리에서 입력을 다시 읽는다). 입력을 그 폴더로 옮겨 다시 계산한다'] : []), `손 — 행동 하나 ${m.손.행동초}초(${잰.기록 === undefined ? '새 판 행동기록 없음 · 첫 값' : `${잰.기록} 에서 잼`}) · ${걸음.글}`];
  if (m.재현 !== undefined) {
    const 판 = 자료 === undefined ? undefined : 판기록들(자료).find((r) => r.이름 === m.재현!.기록);
    const 행 = 판 === undefined ? null : 행동기록읽기(판);
    if (행 === null || 행.length === 0) return { 틀림: `재현.기록 ${m.재현.기록} 판 기록에 행동기록이 없다 — 판 함수가 돌려준 값의 행동기록 을 그대로 따라 돌린다` };
    const r = 돌리기(m, [], 걸음.걷기, 행);
    재현 = { 기록: m.재현.기록, 이김: r.이김, 웨이브수: r.웨이브.length, ...(r.짐 === undefined ? {} : { 짐: r.짐 }) };
    줄글.push(`재현 ${m.재현.기록} — 판 행동기록 ${행.length}개를 그대로 했다 → ${r.이김 ? '이김' : 짐글(r)}`, ...웨이브글(r));
  }
  const 찾음 = 찾기(m, 걸음.걷기);
  if ('틀림' in 찾음) return 찾음;
  const 안 = 찾음.가장 ?? 찾음.가장멀리;
  const 보스 = m.웨이브.some((w) => w.보스);
  줄글.push(`정책 ${m.정책들.length} × 문턱 조합 ${찾음.전체 / m.정책들.length} = ${찾음.전체}번 돌려 ${찾음.이긴수}번 이김`, `${찾음.가장 === null ? '가장 멀리 간 안' : '고른 안'} — 정책 ${안.정책번호 + 1} · 문턱 ${JSON.stringify(안.문턱)}${찾음.가장 === null ? '' : ` · 여유 ${안.여유.toFixed(2)}${안.여유 < 여유기준 ? '(여유 없음 — 손이 조금 늦어도 진다)' : ''}`}`, ...웨이브글(안.결과));
  if (찾음.가장 !== null) 줄글.push('판 함수 인자로 넘길 것(이대로 넘긴다 — 조작 도우미가 정책이 같은지 본다 · 놓기는 자리차례 가운데 빈 앞자리에)', JSON.stringify({ 정책: 안.정책, 자리차례: 자리차례(m) }));
  const 마지막 = 안.결과.웨이브.at(-1);
  const 글 = 찾음.가장 === null ? `이기는 안 없음 — 가장 멀리 간 안도 ${짐글(안.결과)}` : `이기는 안 있음 — ${m.웨이브.length}웨이브${보스 ? '와 보스' : ''}까지 · 마지막 지킬것 ${마지막?.끝지킬것 ?? '?'} · 여유 ${안.여유.toFixed(2)}(${찾음.이긴수}/${찾음.전체} 이김)`;
  return {
    글: 재현 === undefined ? 글 : `${글} · 재현 ${재현.기록} ${재현.이김 ? '이김' : `${재현.짐?.웨이브 ?? '?'} 에서 짐`}`,
    줄글,
    결과: { 계산: '시뮬', 이김: 찾음.가장 !== null, 정책: 안.정책, 정책번호: 안.정책번호, 문턱: 안.문턱, 여유: Math.round(안.여유 * 100) / 100, 이긴수: 찾음.이긴수, 전체: 찾음.전체, 웨이브: 안.결과.웨이브, ...(안.결과.짐 === undefined ? {} : { 짐: 안.결과.짐 }), 손: { 행동초: m.손.행동초, ...(잰.기록 === undefined ? {} : { 기록: 잰.기록 }) }, ...(재현 === undefined ? {} : { 재현 }) },
    입력요약: { 파일, 해시: 해시(파일글), 엔진판, 웨이브수: m.웨이브.length, 보스, 볼값연결: m.볼값연결 },
  };
}
