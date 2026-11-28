// 순서표 — 시뮬이 고른 순서로 흘린 행동기록을 판에서 따라 할 단계로 묶고, 판에서 읽은 상태로 남은 판을 다시 흘릴 모델을 만든다 (도메인/게임 §3.10 「게임플레이」 순서대로 하기)
// 게임을 모른다. 판을 읽고 손을 움직이는 것은 follow.ts 가 판 함수의 손동작으로 한다
import type { 모델, 규칙, 조건, 점, 시작상태, 행동종류 } from './simInput.js';
import { type 찾은안, 나은가, 돌려보기, 점수 } from './simSearch.js';
import type { 걷는거리, 시뮬결과 } from './sim.js';

/** 웨이브마다 지킬것이 시뮬 예측의 이 비율 아래로 내려가면 판이 시뮬과 어긋난 것이다(첫 값) — 기계가 넣는 기대와 판 도중 다시 계산이 같이 쓴다 */
export const 기대여유 = 0.8;
/** 판을 보고 그때그때 하는 동작 — 순서표에 안 넣고 조건으로 넘긴다(적이 어디 있는지는 판에서만 안다) */
export const 반응행동: ReadonlySet<string> = new Set(['공격', '아이템', '회복']);

const 거리 = (a: 점, b: 점): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 초 — 시뮬이 그 행동을 고른 때(계획을 세운 때부터). 판에서도 그때가 되어야 한다 — 시뮬이 재화가 모이길 기다렸다 한 것을 바로 하면 안 된다. 개수 — 이어서 주운 수(줍기). 값 — 드는 재화(모자라면 가기 전에 바닥 재화부터 줍거나 다시 계산한다 · follow.ts 재화 모자람) */
export interface 단계 { 초: number; 행동: 행동종류; 대상?: string; 자리?: 점; 개수?: number; 값?: number }

/**
 * 시뮬 행동기록에서 다음 웨이브가 끝날 때까지 한 것을 단계로 — 이어진 줍기는 한 단계로 묶고, 반응 동작과 안 된 행동은 뺀다.
 * 웨이브가 끝나면 늘 다시 계산하니 그 뒤는 안 싣는다
 */
export function 순서표(r: Pick<시뮬결과, '행동기록' | '웨이브' | '짐'>): 단계[] {
  const 까지 = r.웨이브[0]?.끝초 ?? r.짐?.초 ?? Infinity;
  const 들: 단계[] = [];
  for (const x of r.행동기록) {
    if ((x.끝초 ?? x.초) > 까지) break;
    if (x.됨 === false || 반응행동.has(x.행동)) continue;
    const 앞 = 들.at(-1);
    if (x.행동 === '줍기' && 앞?.행동 === '줍기') 앞.개수 = (앞.개수 ?? 1) + 1;
    else 들.push({ 초: x.초, 행동: x.행동 as 행동종류, ...(x.대상 === undefined ? {} : { 대상: x.대상 }), ...(x.행동 === '줍기' ? { 개수: 1 } : x.자리 === undefined ? {} : { 자리: x.자리 }), ...(x.값 === undefined ? {} : { 값: x.값 }) });
  }
  return 들;
}

/** 사람이 읽는 순서표 한 줄 — 「줍기 8 → 키우기 쌍둥이 (34,34.6) → 이동 (20,31)」 */
export const 표글 = (표: readonly 단계[], 몇 = 12): string =>
  표.length === 0 ? '할 것 없음' : `${표.slice(0, 몇).map((s) => `${s.행동}${s.대상 === undefined ? '' : ` ${s.대상}`}${s.개수 === undefined ? '' : ` ${s.개수}`}${s.자리 === undefined ? '' : ` (${s.자리[0]},${s.자리[1]})`}`).join(' → ')}${표.length > 몇 ? ` … 모두 ${표.length}단계` : ''}`;

/**
 * 판에서 읽은 것 — 웨이브는 지금까지 시작한 웨이브 수(첫 웨이브 전은 0), 웨이브중은 그 웨이브의 적이 아직 남았나.
 * 초는 판 시작부터, 사이지난초는 앞 웨이브가 끝난 것을 본 뒤 지난 초, 적은 판에서 읽은 적 자리(판 함수에 적 읽기가 있을 때)
 */
export interface 본판 extends Omit<시작상태, '첫웨이브까지초' | '적'> { 초: number; 웨이브: number; 웨이브중: boolean; 남은적?: number; 사이지난초: number; 적?: readonly 점[] }

/** 점에서 가장 가까운 길 위 지점 — 어느 길 · 그 길의 진행 거리 · 떨어진 거리 */
function 길에대기(길들: 모델['길'], p: 점): { 길: string; 진행: number; 떨어짐: number } | null {
  let 고른: { 길: string; 진행: number; 떨어짐: number } | null = null;
  for (const [이름, 길] of Object.entries(길들)) {
    let 앞 = 0;
    for (let i = 0; i + 1 < 길.length; i += 1) {
      const [a, b] = [길[i]!, 길[i + 1]!];
      const 길이 = 거리(a, b);
      const t = 길이 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / 길이 ** 2));
      const 떨어짐 = 거리(p, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      if (고른 === null || 떨어짐 < 고른.떨어짐) 고른 = { 길: 이름, 진행: Math.round((앞 + 길이 * t) * 10) / 10, 떨어짐 };
      앞 += 길이;
    }
  }
  return 고른;
}

/**
 * 남은 판을 흘릴 모델 — 남은 웨이브만 두고 판에서 읽은 상태에서 시작한다. 남은 웨이브가 없으면 null.
 * 웨이브 도중이면 판에서 읽은 적은 가장 가까운 길 위 지점에서 잇고(종류는 출현 차례 — 나온 것 가운데 늦게 나온 것이 살아 있고, 길을 많이 간 것이 먼저 나왔다),
 * 아직 안 나온 수(남은 적 − 읽은 적)만 새로 나온다. 2026-11-28 16105 첫 맵 — 길 끝에 선 유령을 길 처음에서 새로 나온다고 쳐서 다시 계산 15번이 다 「이김」이었다.
 * ponytail: 읽은 적의 체력은 몰라 가득으로 친다 — 판에서 체력을 읽는 칸이 생기면 그것으로. 적을 못 읽는 판 함수면 남은 적 수만큼 처음부터 다시 나온다고 친다(실제보다 유리하다)
 */
export function 이어모델(m: 모델, 판: 본판): 모델 | null {
  const 남은 = m.웨이브.slice(Math.max(0, 판.웨이브중 ? 판.웨이브 - 1 : 판.웨이브));
  const 머리 = 남은[0];
  if (머리 === undefined) return null;
  const 전체 = 머리.출현.reduce((a, o) => a + o.수, 0);
  // 남은 적 수를 모르면 읽은 적을 안 쓴다 — 안 나온 수를 셀 수 없어 그 웨이브를 다 지워 버린다
  const 읽은 = 판.웨이브중 && 판.적 !== undefined && 판.남은적 !== undefined ? 판.적.flatMap((p) => { const 곳 = 길에대기(m.길, p); return 곳 === null ? [] : [곳]; }) : null;
  // 출현 차례 — 몇 번째 출현 묶음의 적인가. 아직 안 나온 것은 차례의 끝이다
  const 차례 = 머리.출현.flatMap((o, k) => Array.from({ length: o.수 }, (_, n) => ({ k, 초: o.처음초 + n * o.간격 }))).sort((a, b) => a.초 - b.초);
  // 안 나온 수 — 남은 적이 웨이브를 넘어 세어도(다음 웨이브까지 세는 게임) 이 웨이브에서 읽은 것을 뺀 것보다 많을 수 없다
  const 나올 = 읽은 === null ? 판.남은적 : Math.min(Math.max(0, 전체 - 읽은.length), Math.max(0, 판.남은적! - 읽은.length));
  const 안나온 = 읽은 === null || 나올 === undefined ? [] : 차례.slice(차례.length - 나올);
  const 줄인 = !판.웨이브중 || 나올 === undefined || (읽은 === null && 나올 >= 전체)
    ? 머리
    : { ...머리, 출현: 머리.출현.map((o, k) => ({ ...o, 수: 읽은 === null ? Math.max(1, Math.ceil((o.수 * 나올) / 전체)) : 안나온.filter((x) => x.k === k).length, 처음초: 0 })) };
  const 웨이브 = [줄인, ...남은.slice(1)].map((w) => (w.시작초 === undefined ? w : { ...w, 시작초: Math.max(0, w.시작초 - 판.초) }));
  const 첫웨이브까지초 = 판.웨이브중 ? 0 : Math.max(0, 머리.시작초 === undefined ? 머리.쉬는초 - 판.사이지난초 : 머리.시작초 - 판.초);
  const 시작: 시작상태 = { 지킬것: 판.지킬것, 재화: 판.재화, 자리: 판.자리, 설치물: 판.설치물, 떨어진: 판.떨어진, 첫웨이브까지초 };
  if (읽은 !== null && 읽은.length > 0) {
    // 나온 것 가운데 늦게 나온 것이 살아 있고, 길을 많이 간 것이 먼저 나왔다
    const 산 = 차례.slice(0, 차례.length - 안나온.length).slice(-읽은.length);
    const 종류 = (i: number): string => 머리.출현[(산[i] ?? 차례.at(-1) ?? { k: 0 }).k]!.종류;
    시작.적 = [...읽은].sort((a, b) => b.진행 - a.진행).map((x, i) => ({ 종류: 종류(i), 길: x.길, 진행: x.진행 }));
  }
  return { ...m, 웨이브, 시작 };
}

/** 후보 순서들을 지금 상태에서 흘려 가장 나은 것 — 고른 순서와 버금 순서를 같이 견준다 */
export function 다시고르기(m: 모델, 정책들: readonly 규칙[][], 걷기?: 걷는거리): { 안: 찾은안; 번호: number } {
  let 고른: { 안: 찾은안; 번호: number } | null = null;
  for (const [번호, 정책] of 정책들.entries()) {
    const 안 = 돌려보기(m, 정책, 걷기);
    if (고른 === null || 나은가(점수(안), 점수(고른.안))) 고른 = { 안, 번호 };
  }
  return 고른!;
}

/** 시뮬 예상에서 그 초의 값 — 그 초 이전 마지막 예상 */
export function 예상값(예상: 시뮬결과['예상'], 초: number, 이름: string | undefined): number | undefined {
  if (이름 === undefined) return undefined;
  let 값: number | undefined;
  for (const x of 예상) {
    if (x.초 > 초) break;
    값 = x.값[이름] ?? 값;
  }
  return 값;
}

/** 판에서 본 것 — 반응 동작의 조건을 엔진과 같은 뜻으로 잰다. 캐릭터 체력은 안 읽어 가득으로 친다 */
export interface 본것 { 지킬것: number; 재화: number; 웨이브: number; 자리: 점; 적: readonly 점[]; 떨어진: readonly 점[]; 유지최저: number }
const 맞나 = (a: number, 비: string, b: number): boolean => (비 === '>=' ? a >= b : 비 === '<=' ? a <= b : 비 === '>' ? a > b : 비 === '<' ? a < b : a === b);
function 조건값(c: 조건, 본: 본것, m: 모델): number {
  const r = c.반경 ?? 0;
  switch (c.값) {
    case '지킬것체력': return 본.지킬것;
    case '지킬것비율': return 본.지킬것 / m.지킬것.체력;
    case '재화': return 본.재화;
    case '캐릭터체력비율': return 1;
    case '웨이브': return 본.웨이브;
    case '지킬것둘레적수': return 본.적.filter((p) => 거리(p, m.지킬것.자리) <= r).length;
    case '캐릭터둘레적수': return 본.적.filter((p) => 거리(p, 본.자리) <= r).length;
    case '캐릭터둘레재화수': return 본.떨어진.filter((p) => 거리(p, 본.자리) <= r).length;
    case '지킬것가까운적거리': return Math.min(Infinity, ...본.적.map((p) => 거리(p, m.지킬것.자리)));
    case '유지최저비율': return 본.유지최저;
  }
}

/**
 * 지금 할 반응 동작 — 순서의 위에서부터 조건이 맞고 할 수 있는 첫 반응 규칙. 쿨은 이름마다 다시 쓸 수 있는 초(공격은 '공격'), 쓴개수는 아이템마다 쓴 수.
 * 공격 · 아이템은 지킬것에 가장 가까운 적 자리(규칙에 반경이 있으면 지킬것 둘레 그 안)를 겨눈다
 */
export function 반응고르기(정책: readonly 규칙[], 본: 본것, m: 모델, 지금초: number, 쿨: Readonly<Record<string, number>>, 쓴개수: Readonly<Record<string, number>>): { 규칙: 규칙; 자리?: 점 } | null {
  for (const r of 정책) {
    const { 무엇, 대상, 반경 } = r.행동;
    if (!반응행동.has(무엇) || !r.조건.every((c) => 맞나(조건값(c, 본, m), c.비교, c.기준 as number))) continue;
    if ((쿨[대상 ?? 무엇] ?? 0) > 지금초) continue;
    if (무엇 === '회복') {
      const 수단 = m.회복[대상!]!;
      if (본.재화 < 수단.값 || (수단.대상 === '지킬것' && 본.지킬것 >= m.지킬것.체력)) continue;
      return { 규칙: r };
    }
    if (무엇 === '아이템' && (쓴개수[대상!] ?? 0) >= (m.아이템[대상!]!.개수 ?? Infinity)) continue;
    const 겨눌 = 본.적.filter((p) => 반경 === undefined || 거리(p, m.지킬것.자리) <= 반경).sort((a, b) => 거리(a, m.지킬것.자리) - 거리(b, m.지킬것.자리))[0];
    if (겨눌 !== undefined) return { 규칙: r, 자리: 겨눌 };
  }
  return null;
}

/** 가까운 것부터 한 바퀴 — 지금 자리에서 가장 가까운 것, 거기서 또 가장 가까운 것 차례로 */
export function 가까운순(들: readonly 점[], 어디서: 점): 점[] {
  const 남은 = [...들];
  const 차례: 점[] = [];
  let 지금 = 어디서;
  while (남은.length > 0) {
    let 가 = 0;
    for (let i = 1; i < 남은.length; i += 1) if (거리(남은[i]!, 지금) < 거리(남은[가]!, 지금)) 가 = i;
    지금 = 남은.splice(가, 1)[0]!;
    차례.push(지금);
  }
  return 차례;
}
