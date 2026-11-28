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
const 엔진머리 = '~';
const 둥 = (v: number): number => Math.round(v * 10) / 10;

/**
 * 모델에 있는 수단마다 엔진이 만드는 규칙 — AI 가 규칙에 안 적은 행동도 순서에 넣어 본다(2026-11-28 사용자 「게임의 룰과 데이터를 모두 가지고 있는데」).
 * 설치물마다 놓기 · 키우기 · 먹이, 아이템 · 회복마다 하나, 캐릭터 공격, 줍기, 지킬것 앞으로 이동. 문턱 이름은 `~` 로 시작해 AI 문턱과 안 겹친다.
 * 씨는 찾기를 시작할 순서들 — 모든 설치물을 쓰는 것 하나와 설치물 하나만 쓰는 것들
 */
export function 모델규칙(m: 모델): { 규칙들: 규칙[]; 씨: 규칙[][]; 문턱: Record<string, { 값들: number[]; 시작: number }> } {
  const 문턱: Record<string, { 값들: number[]; 시작: number }> = {};
  const 턱 = (이름: string, 값들: number[], 시작: number): string => {
    문턱[`${엔진머리}${이름}`] = { 값들: [...new Set(값들)].sort((a, b) => a - b), 시작 };
    return `$${엔진머리}${이름}`;
  };
  const 종류들 = Object.values(m.설치물종류);
  const 아이템 = Object.values(m.아이템).map((x): 규칙 => ({ 조건: [{ 값: '지킬것둘레적수', 반경: Math.max(x.사거리, x.범위, 1), 비교: '>=', 기준: 턱(`몰림:${x.이름}`, 수값, 2) }], 행동: { 무엇: '아이템', 대상: x.이름 } }));
  const 회복 = Object.values(m.회복).map((x): 규칙 => ({ 조건: [{ 값: x.대상 === '지킬것' ? '지킬것비율' : '캐릭터체력비율', 비교: '<', 기준: 턱(`낮음:${x.이름}`, 비율값, 0.5) }], 행동: { 무엇: '회복', 대상: x.이름 } }));
  const 공 = m.캐릭터.공격;
  const 공격: 규칙[] = 공 === undefined ? [] : [{ 조건: [{ 값: '지킬것가까운적거리', 비교: '<=', 기준: 턱('막을거리', [1, 2, 4, 8].map((k) => 둥(공.사거리 * k)), 둥(공.사거리 * 2)) }], 행동: { 무엇: '공격' } }];
  const 설치 = (t: (typeof 종류들)[number]): { 먹이: 규칙[]; 놓기: 규칙; 키우기: 규칙[] } => {
    const 값들 = t.레벨.slice(1).flatMap((l, i) => [l.값, t.레벨.slice(1, i + 2).reduce((a, x) => a + x.값, 0)]).filter((v) => v > 0);
    return {
      먹이: t.유지?.먹이 === undefined ? [] : [{ 조건: [{ 값: '유지최저비율', 비교: '<', 기준: 턱(`먹일때:${t.이름}`, 비율값, 0.5) }], 행동: { 무엇: '먹이', 대상: t.이름 } }],
      놓기: { 조건: [], 행동: { 무엇: '놓기', 대상: t.이름 } },
      키우기: 값들.length === 0 ? [] : [{ 조건: [{ 값: '재화', 비교: '>=', 기준: 턱(`모음:${t.이름}`, 값들, Math.min(...값들)) }], 행동: { 무엇: '키우기', 대상: t.이름 } }],
    };
  };
  const 것들 = 종류들.map(설치);
  const 줍기: 규칙[] = m.재화.줍기 ? [{ 조건: [], 행동: { 무엇: '줍기' } }] : [];
  const 한벌 = (고른: readonly number[]): 규칙[] => [...아이템, ...회복, ...고른.flatMap((i) => 것들[i]!.먹이), ...공격, ...고른.map((i) => 것들[i]!.놓기), ...고른.flatMap((i) => 것들[i]!.키우기), ...줍기, { 조건: [], 행동: { 무엇: '이동', 대상: '지킬것' } }];
  const 모두 = 종류들.map((_, i) => i);
  return { 규칙들: 한벌(모두), 씨: [한벌(모두), ...(모두.length > 1 ? 모두.map((i) => 한벌([i])) : [])], 문턱 };
}

/** 문턱마다 바꿔 볼 값 — AI 후보에, 그 문턱이 견주는 값의 종류로 엔진이 더한다(재화는 모델의 값표 · 비율 · 마릿수 · 그 밖은 AI 후보만). 엔진이 만든 규칙의 문턱(`~`)도 같이 낸다 */
export function 문턱격자(m: 모델): Record<string, number[]> {
  const 값표 = Object.values(m.설치물종류).flatMap((t) => [...t.레벨.map((l) => l.값), ...t.레벨.map((_, i) => t.레벨.slice(0, i + 1).reduce((a, l) => a + l.값, 0)), ...(t.유지?.먹이 === undefined ? [] : [t.유지.먹이.값])]).filter((v) => v > 0);
  const 격자: Record<string, number[]> = Object.fromEntries(Object.entries(모델규칙(m).문턱).map(([k, v]) => [k, v.값들]));
  for (const [k, 후보] of Object.entries(m.문턱후보)) {
    const 쓰임 = new Set(m.정책들.flat().flatMap((r) => r.조건.filter((c) => c.기준 === `$${k}`).map((c) => c.값)));
    const 더 = [...쓰임].flatMap((값) => (값 === '재화' ? 값표 : 값.endsWith('비율') ? 비율값 : 값.endsWith('수') ? 수값 : []));
    격자[k] = [...new Set([...후보, ...더])].sort((a, b) => a - b);
  }
  return 격자;
}

interface 후보 { 틀: 규칙[]; 문턱: Record<string, number> }
const 고르기들 = [undefined, '높은', '낮은'] as const;

/** 하나만 바꾼 이웃 — 문턱 하나를 격자의 옆 값으로 · 키우기 대상 고르기를 다른 것으로 · 규칙 하나를 다른 자리로 · 규칙 하나를 빼기 · 풀에 있는 규칙 하나를 넣기 */
function 이웃들(c: 후보, 격자: Readonly<Record<string, number[]>>, 풀: readonly 규칙[]): 후보[] {
  const 들: 후보[] = [];
  const 쓰는 = new Set(c.틀.flatMap((r) => r.조건.map((x) => x.기준)).filter((x): x is string => typeof x === 'string').map((x) => x.slice(1)));
  for (const [k, 값들] of Object.entries(격자)) {
    if (!쓰는.has(k)) continue;
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
  for (let i = 0; i < c.틀.length; i += 1) {
    for (let j = 0; j < c.틀.length; j += 1) {
      if (i === j) continue;
      const 틀 = [...c.틀];
      틀.splice(j, 0, 틀.splice(i, 1)[0]!);
      들.push({ ...c, 틀 });
    }
  }
  if (c.틀.length > 1) for (let i = 0; i < c.틀.length; i += 1) 들.push({ ...c, 틀: c.틀.filter((_, n) => n !== i) });
  const 꼴 = (r: 규칙): string => JSON.stringify({ ...r, 행동: { ...r.행동, 고르기: undefined } });
  const 있는 = new Set(c.틀.map(꼴));
  for (const r of 풀) {
    if (있는.has(꼴(r))) continue;
    for (let j = 0; j <= c.틀.length; j += 1) 들.push({ ...c, 틀: [...c.틀.slice(0, j), r, ...c.틀.slice(j)] });
  }
  return 들;
}

function 조합들(후보: Readonly<Record<string, number[]>>): Record<string, number>[] {
  return Object.entries(후보).reduce<Record<string, number>[]>((들, [k, 값들]) => 들.flatMap((x) => 값들.map((v) => ({ ...x, [k]: v }))), [{}]);
}

/** 한 출발점에서 오르는 데 쓰는 시뮬 횟수의 바닥 — 남은 횟수의 반과 이 값 가운데 큰 쪽까지 쓴다 */
const 오르기바닥 = 200;
/** 오르기를 시작할 출발점 수 — 점수가 높은 것부터, 규칙 묶음이 서로 다른 것으로 */
const 출발수 = 4;

/**
 * AI 정책 × 문턱 조합과 엔진이 모델에서 만든 순서(모델규칙의 씨)를 다 돌린 뒤, 나은 것들에서 하나씩 바꿔 더 나은 이웃이 보이면 바로 옮겨 간다(더 나은 이웃이 없거나 상한이면 멈춘다).
 * 규칙은 AI 가 적은 것과 엔진이 만든 것을 한 풀로 넣고 뺀다 — 규칙표 하나 안에서만 자리를 바꾸면 다른 규칙표의 행동(먹이 같은)을 못 가져온다(16103 둘째 맵).
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
  const 엔진 = 모델규칙(m);
  const 격자 = 문턱격자(m);
  const 풀 = [...new Map([...m.정책들.flat(), ...엔진.규칙들].map((r) => [JSON.stringify(r), r])).values()];
  const 시작문턱 = Object.fromEntries(Object.entries(엔진.문턱).map(([k, v]) => [k, v.시작]));
  const 씨들 = [...m.정책들.flatMap((틀) => 조합.map((문턱) => ({ 틀, 문턱: { ...시작문턱, ...문턱 } }))), ...엔진.씨.map((틀) => ({ 틀, 문턱: { ...시작문턱, ...조합[0]! } }))].map((c) => ({ c, 안: 보기(c) }));
  씨들.sort((a, b) => (나은가(점수(a.안), 점수(b.안)) ? -1 : 나은가(점수(b.안), 점수(a.안)) ? 1 : 0));
  const 오르기 = (출발: { c: 후보; 안: 찾은안 }, 까지: number): void => {
    let 선 = 출발;
    for (let 나아짐 = true; 나아짐 && 돈수 < 까지; ) {
      나아짐 = false;
      for (const c of 이웃들(선.c, 격자, 풀)) {
        if (돈수 >= 까지) break;
        const 안 = 보기(c);
        if (!나은가(점수(안), 점수(선.안))) continue;
        [선, 나아짐] = [{ c, 안 }, true];
        break;
      }
    }
  };
  // 규칙 묶음이 서로 다른 출발점 몇 곳에서 오른다 — 한 봉우리에 갇히지 않게
  const 본틀 = new Set<string>();
  for (const 씨 of 씨들) {
    if (본틀.size >= 출발수 || 돈수 >= 상한) break;
    const 틀꼴 = JSON.stringify(씨.c.틀);
    if (본틀.has(틀꼴)) continue;
    본틀.add(틀꼴);
    오르기(씨, Math.min(상한, 돈수 + Math.max(오르기바닥, Math.ceil((상한 - 돈수) / 2))));
  }
  const 차례 = [...본.values()].sort((a, b) => (나은가(점수(a), 점수(b)) ? -1 : 나은가(점수(b), 점수(a)) ? 1 : 0));
  const 이긴 = 차례.filter((x) => x.결과.이김);
  return { 가장: 이긴[0] ?? null, 가장멀리: 차례[0]!, 버금: 차례.slice(1, 5), 이긴수: 이긴.length, 전체: 차례.length };
}

/** 그 정책이 입력 파일의 규칙이나 엔진이 그 모델에서 만든 규칙으로 된 것인가 — 규칙마다 그 가운데 어느 규칙과 조건 · 행동이 같아야 한다($문턱 자리는 수면 되고 키우기 고르기는 안 본다). 줄 글자를 고쳐 다른 행동을 넣지 못하게 */
export function 입력정책인가(m: 모델, 정책: readonly 규칙[]): boolean {
  const 행동꼴 = (r: 규칙): string => JSON.stringify([r.행동.무엇, r.행동.대상 ?? null, r.행동.자리 ?? null, r.행동.반경 ?? null]);
  const 같은규칙 = (r: 규칙, 입: 규칙): boolean =>
    행동꼴(r) === 행동꼴(입) && r.조건.length === 입.조건.length && r.조건.every((c, i) => {
      const d = 입.조건[i]!;
      return c.값 === d.값 && c.비교 === d.비교 && (c.반경 ?? null) === (d.반경 ?? null) && (typeof d.기준 === 'string' ? typeof c.기준 === 'number' : c.기준 === d.기준);
    });
  const 입력규칙 = [...m.정책들.flat(), ...모델규칙(m).규칙들];
  return 정책.length > 0 && 정책.every((r) => 입력규칙.some((입) => 같은규칙(r, 입)));
}

const 비교글: Record<string, string> = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '==': '=' };
/** 사람이 읽는 순서 한 줄 — 「아이템 폭탄(지킬것둘레적수≥2) > 줍기 > 키우기 쌍둥이·높은(재화≥17)」 */
export const 정책글 = (정책: readonly 규칙[]): string =>
  정책.map((r) => `${r.행동.무엇}${r.행동.대상 === undefined ? '' : ` ${r.행동.대상}`}${r.행동.고르기 === undefined ? '' : `·${r.행동.고르기}`}${r.조건.length === 0 ? '' : `(${r.조건.map((c) => `${c.값}${비교글[c.비교]}${String(c.기준)}`).join(' · ')})`}`).join(' > ');
