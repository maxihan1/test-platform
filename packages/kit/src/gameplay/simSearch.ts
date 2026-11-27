// 순서 찾기 — AI 가 적은 정책에서 시작해 규칙 자리 · 문턱 · 키우기 대상을 하나씩 바꿔 가며 더 나은 순서를 엔진이 찾는다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 16103 첫 맵은 AI 가 적은 규칙표 하나와 숫자 여덟 조합만 견줘, 고기 서너 개를 줍고 식물로 뛰어가는 순서가 그대로 판에 나갔다(2026-11-28 사용자 「왜 시뮬레이션으로 이걸 안 그렸냐」)
// 무작위가 없다 — 같은 입력이면 같은 순서를 찾는다
import { type 모델, type 규칙, 문턱넣기 } from './simInput.js';
import { type 걷는거리, type 시뮬결과, 돌리기 } from './sim.js';

/** AI 가 적은 정책 × 문턱 조합을 이만큼 넘게 돌리지 않는다 — 후보를 줄여 달라고 알린다 */
export const 조합상한 = 400;
/** 순서를 찾느라 시뮬을 돌리는 횟수 상한(첫 값) — 한 번이 0.05초쯤이라 1분 남짓이다 */
export const 찾기상한 = 1500;
/** 손이 이만큼 느려도 이기는 순서를 먼저 고른다(첫 값) */
export const 느린손배 = 1.5;

export interface 찾은안 { 정책: 규칙[]; 문턱: Record<string, number>; 결과: 시뮬결과; 느려도이김: boolean }
/** 버금 — 고른 것 다음으로 나은 순서들. 판 도중 다시 계산할 때 고른 것과 같이 견준다 */
export interface 찾기결과 { 가장: 찾은안 | null; 가장멀리: 찾은안; 버금: 찾은안[]; 이긴수: number; 전체: number }

export const 느린손 = (m: 모델): 모델 => ({ ...m, 손: { 행동초: m.손.행동초 * 느린손배, ...(m.손.종류별 === undefined ? {} : { 종류별: Object.fromEntries(Object.entries(m.손.종류별).map(([k, v]) => [k, v * 느린손배])) }) } });

/** 큰 쪽이 낫다 — 이김 → 느린 손에도 이김 → 웨이브 끝 지킬것이 가장 낮았던 값 → 남은 재화. 못 이겼으면 간 웨이브 수 → 버틴 초 */
export const 점수 = (a: Pick<찾은안, '결과' | '느려도이김'>): number[] =>
  a.결과.이김 ? [1, a.느려도이김 ? 1 : 0, Math.min(...a.결과.웨이브.map((w) => w.끝지킬것)), a.결과.웨이브.at(-1)?.끝재화 ?? 0] : [0, a.결과.웨이브.length, a.결과.짐?.초 ?? 0, 0];
export function 나은가(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
}

/** 정책 하나를 돌려 본다 — 이기면 느린 손으로 한 번 더 */
export function 돌려보기(m: 모델, 정책: 규칙[], 걷기?: 걷는거리, 문턱: Record<string, number> = {}): 찾은안 {
  const 결과 = 돌리기(m, 정책, 걷기);
  return { 정책, 문턱, 결과, 느려도이김: 결과.이김 && 돌리기(느린손(m), 정책, 걷기).이김 };
}

const 비율값 = [0.2, 0.35, 0.5, 0.65, 0.8];
const 수값 = [1, 2, 3, 5, 8];
/** 문턱마다 바꿔 볼 값 — AI 후보에, 그 문턱이 견주는 값의 종류로 엔진이 더한다(재화는 모델의 값표 · 비율 · 마릿수). 그 밖은 AI 후보만 */
export function 문턱격자(m: 모델): Record<string, number[]> {
  const 값표 = Object.values(m.설치물종류).flatMap((t) => [...t.레벨.map((l) => l.값), ...t.레벨.map((_, i) => t.레벨.slice(0, i + 1).reduce((a, l) => a + l.값, 0)), ...(t.유지?.먹이 === undefined ? [] : [t.유지.먹이.값])]).filter((v) => v > 0);
  const 격자: Record<string, number[]> = {};
  for (const [k, 후보] of Object.entries(m.문턱후보)) {
    const 쓰임 = new Set(m.정책들.flat().flatMap((r) => r.조건.filter((c) => c.기준 === `$${k}`).map((c) => c.값)));
    const 더 = [...쓰임].flatMap((값) => (값 === '재화' ? 값표 : 값.endsWith('비율') ? 비율값 : 값.endsWith('수') ? 수값 : []));
    격자[k] = [...new Set([...후보, ...더])].sort((a, b) => a - b);
  }
  return 격자;
}

interface 후보 { 틀: 규칙[]; 문턱: Record<string, number> }
const 고르기들 = [undefined, '높은', '낮은'] as const;

/** 하나만 바꾼 이웃 — 규칙 하나를 다른 자리로 · 문턱 하나를 격자의 옆 값으로 · 키우기 대상 고르기를 다른 것으로 */
function 이웃들(c: 후보, 격자: Readonly<Record<string, number[]>>): 후보[] {
  const 들: 후보[] = [];
  for (let i = 0; i < c.틀.length; i += 1) {
    for (let j = 0; j < c.틀.length; j += 1) {
      if (i === j) continue;
      const 틀 = [...c.틀];
      틀.splice(j, 0, 틀.splice(i, 1)[0]!);
      들.push({ ...c, 틀 });
    }
  }
  for (const [k, 값들] of Object.entries(격자)) {
    const 자 = 값들.indexOf(c.문턱[k]!);
    for (const v of [값들[자 - 1], 값들[자 + 1]]) if (v !== undefined) 들.push({ ...c, 문턱: { ...c.문턱, [k]: v } });
  }
  for (const [i, r] of c.틀.entries()) {
    if (r.행동.무엇 !== '키우기') continue;
    for (const g of 고르기들) {
      if (g === r.행동.고르기) continue;
      const { 고르기: _앞, ...행 } = r.행동;
      들.push({ ...c, 틀: c.틀.map((x, n) => (n === i ? { ...x, 행동: g === undefined ? 행 : { ...행, 고르기: g } } : x)) });
    }
  }
  return 들;
}

function 조합들(후보: Readonly<Record<string, number[]>>): Record<string, number>[] {
  return Object.entries(후보).reduce<Record<string, number>[]>((들, [k, 값들]) => 들.flatMap((x) => 값들.map((v) => ({ ...x, [k]: v }))), [{}]);
}

/**
 * AI 정책 × 문턱 조합을 다 돌린 뒤, 가장 나은 것에서 하나씩 바꿔 더 나은 이웃으로 옮겨 간다(더 나은 이웃이 없으면 규칙 하나를 맨 위로 올려 다시 · 상한이면 멈춘다).
 * 이긴 것 가운데 점수가 가장 높은 안, 못 이겼으면 가장 멀리 간 안
 */
export function 찾기(m: 모델, 걷기?: 걷는거리, 상한 = 찾기상한): 찾기결과 | { 틀림: string } {
  const 조합 = 조합들(m.문턱후보);
  if (조합.length * m.정책들.length > 조합상한) return { 틀림: `정책 ${m.정책들.length} × 문턱 조합 ${조합.length} = ${조합.length * m.정책들.length} 번은 너무 많다(${조합상한} 번까지) — 문턱후보를 줄인다(엔진이 둘레 값을 더 찾아본다)` };
  const 본 = new Map<string, 찾은안>();
  let 돈수 = 0;
  const 보기 = (c: 후보): 찾은안 => {
    const 정책 = 문턱넣기(c.틀, c.문턱);
    const 열쇠 = JSON.stringify(정책);
    let 안 = 본.get(열쇠);
    if (안 === undefined) {
      안 = 돌려보기(m, 정책, 걷기, c.문턱);
      돈수 += 안.결과.이김 ? 2 : 1;
      본.set(열쇠, 안);
    }
    return 안;
  };
  let 지금: { c: 후보; 안: 찾은안 } | null = null;
  for (const 틀 of m.정책들) {
    for (const 문턱 of 조합) {
      const c = { 틀, 문턱 };
      const 안 = 보기(c);
      if (지금 === null || 나은가(점수(안), 점수(지금.안))) 지금 = { c, 안 };
    }
  }
  const 격자 = 문턱격자(m);
  const 오르기 = (출발: 후보): 후보 => {
    let 선 = { c: 출발, 안: 보기(출발) };
    while (돈수 < 상한) {
      let 나은: { c: 후보; 안: 찾은안 } | null = null;
      for (const c of 이웃들(선.c, 격자)) {
        if (돈수 >= 상한) break;
        const 안 = 보기(c);
        if (나은가(점수(안), 점수((나은 ?? 선).안))) 나은 = { c, 안 };
      }
      if (나은 === null) break;
      선 = 나은;
    }
    return 선.c;
  };
  // 한 봉우리에서 막히면 규칙 하나를 맨 위로 올린 데서 다시 올라 본다 — 무작위 없이 다른 순서를 더 본다
  const 첫 = 오르기(지금!.c);
  for (let i = 1; i < 첫.틀.length && 돈수 < 상한; i += 1) 오르기({ ...첫, 틀: [첫.틀[i]!, ...첫.틀.filter((_, n) => n !== i)] });
  const 차례 = [...본.values()].sort((a, b) => (나은가(점수(a), 점수(b)) ? -1 : 나은가(점수(b), 점수(a)) ? 1 : 0));
  const 이긴 = 차례.filter((x) => x.결과.이김);
  return { 가장: 이긴[0] ?? null, 가장멀리: 차례[0]!, 버금: 차례.slice(1, 5), 이긴수: 이긴.length, 전체: 차례.length };
}

/** 그 정책이 입력 파일의 규칙들로 만든 것인가 — 규칙마다 입력의 어느 규칙과 조건 · 행동이 같아야 한다($문턱 자리는 수면 되고 키우기 고르기는 안 본다). 줄 글자를 고쳐 다른 행동을 넣지 못하게 */
export function 입력정책인가(m: 모델, 정책: readonly 규칙[]): boolean {
  const 행동꼴 = (r: 규칙): string => JSON.stringify([r.행동.무엇, r.행동.대상 ?? null, r.행동.자리 ?? null, r.행동.반경 ?? null]);
  const 같은규칙 = (r: 규칙, 입: 규칙): boolean =>
    행동꼴(r) === 행동꼴(입) && r.조건.length === 입.조건.length && r.조건.every((c, i) => {
      const d = 입.조건[i]!;
      return c.값 === d.값 && c.비교 === d.비교 && (c.반경 ?? null) === (d.반경 ?? null) && (typeof d.기준 === 'string' ? typeof c.기준 === 'number' : c.기준 === d.기준);
    });
  const 입력규칙 = m.정책들.flat();
  return 정책.length > 0 && 정책.every((r) => 입력규칙.some((입) => 같은규칙(r, 입)));
}

const 비교글: Record<string, string> = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '==': '=' };
/** 사람이 읽는 순서 한 줄 — 「아이템 폭탄(지킬것둘레적수≥2) > 줍기 > 키우기 쌍둥이·높은(재화≥17)」 */
export const 정책글 = (정책: readonly 규칙[]): string =>
  정책.map((r) => `${r.행동.무엇}${r.행동.대상 === undefined ? '' : ` ${r.행동.대상}`}${r.행동.고르기 === undefined ? '' : `·${r.행동.고르기}`}${r.조건.length === 0 ? '' : `(${r.조건.map((c) => `${c.값}${비교글[c.비교]}${String(c.기준)}`).join(' · ')})`}`).join(' > ');
