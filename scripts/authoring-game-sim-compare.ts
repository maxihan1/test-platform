// 재현 비교 — 판 기록(값기록 2초마다)과 그 판 행동기록을 그대로 따라 한 시뮬을 같은 시각끼리 나란히 놓고, 처음 크게 어긋난 값 · 때 · 그 앞 행동 · 고칠 곳 · 판에서 잰 값을 짚는다 (도메인/게임 §3.10 「게임플레이」 재현)
// 2026-11-28 사용자 「근본 원인을 파악해」 — 웨이브 수 하나만 견줘 「어긋났다」는 알아도 「어느 규칙이」는 몰라, 판을 통째로 진 뒤 사람이 기록을 뒤져 규칙을 하나씩 찾았다(하루 일곱 번)
import { type 모델, type 시뮬결과, type 행동, 예상간격초 } from '@platform/kit/gameplay';

import type { 값기록 } from './authoring-learn-check.js';

export const 비교이름들 = ['웨이브', '지킬것', '재화', '처치'] as const;
export type 비교이름 = (typeof 비교이름들)[number];
/** 판 값 — 순서대로 하기 시계(행동기록 · 재현 시뮬과 같은 시계)로 옮긴 값기록 한 줄. 처치는 판에서 올라간 수만 더한 누적이다(웨이브마다 0 으로 돌아가는 판도 같이 센다) */
export type 판값 = { 초: number } & Partial<Record<비교이름, number>>;
/** 한 번 부른 판 조각 — 시간 한도로 나눠 이어 부른 판은 조각이 여럿이다 */
export interface 판조각 { 값기록: 값기록; 따라감?: unknown }
export interface 어긋남 { 초: number; 값: 비교이름 | '끝'; 판: number | null; 시뮬: number | null; 앞행동: string | null; 고칠곳: string; 잰값: string }
export interface 재현비교 { 맞음: boolean; 본수: number; 어긋남: 어긋남 | null; 표: { 초: number; 판: 판값; 시뮬: 판값 }[] }

/** 이만큼 이어서 어긋나야 어긋남이다(첫 값) — 웨이브가 넘어가는 순간 · 손 시간 흔들림으로 한두 번 다른 것은 넘긴다 */
export const 지속초 = 8;
/**
 * 값마다 허용 차이(첫 값) — 손 시간 · 걷기 오차로 생기는 흔들림보다 크고, 16104 에서 본 어긋남(둘째 맵 1웨이브 끝 재화 판 9 · 재현 0 · 재현이 3웨이브에서 짐)은 잡는 크기.
 * 웨이브는 하나만 달라도 어긋남이다
 */
const 허용 = (이름: 비교이름, 판: number, 시뮬: number, 지킬것최대: number): number =>
  이름 === '웨이브' ? 0.5 : 이름 === '지킬것' ? Math.max(2, 지킬것최대 * 0.1) : 이름 === '재화' ? Math.max(5, Math.max(Math.abs(판), Math.abs(시뮬)) * 0.3) : Math.max(5, Math.max(판, 시뮬) * 0.25);
/** 어긋난 값마다 고칠 입력 칸 — AI 가 다른 값을 비틀어 맞추지 않게 그 값에 걸린 칸만 가리킨다(16102 는 재화가 어긋났는데 유지 값을 바꿔 맞췄다) */
export const 고칠곳: Record<비교이름 | '끝', string> = {
  웨이브: '웨이브(쉬는초 · 시작초 · 출현 수 · 간격 · 처음초) · 적종류 체력 · 속도',
  지킬것: '적종류(체력 · 속도 · 닿으면피해 · 끝초당피해) · 설치물 레벨(공격력 · 사거리 · 간격 · 타깃수 · 범위) · 유지',
  재화: '적종류 보상 · 재화(시작 · 초당 · 줍기 · 줍는거리) · 놓기 · 키우기 · 먹이 값',
  처치: '설치물 레벨(공격력 · 사거리 · 간격 · 타깃수 · 범위) · 자라는초 · 적종류 체력',
  끝: '적종류(체력 · 속도 · 닿으면피해 · 끝초당피해) · 설치물 레벨 · 유지',
};

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 둥 = (v: number): number => Math.round(v * 10) / 10;

/**
 * 판 조각들을 순서대로 하기 시계로 옮긴다. 조각마다 값기록 시계와 순서대로 하기 시계의 차이는 둘의 시작때(epoch ms)로 재고,
 * 시작때가 없는 옛 기록은 값이 처음 읽힌 때를 순서대로 하기가 시작한 때로 본다(판에 들어가기 전에는 볼값이 비어 있다). 순서대로 하기가 끝난 뒤(결과 화면) 값은 버린다
 */
export function 판값들(조각들: readonly 판조각[], 연결: 모델['볼값연결']): 판값[] {
  const 이름표 = 비교이름들.flatMap((k) => (연결[k] === undefined ? [] : [[k, 연결[k]!] as const]));
  const 줄들: 판값[] = [];
  let 앞처치: number | null = null;
  let 처치누적 = 0;
  for (const 조각 of 조각들) {
    const 따 = 객체(조각.따라감);
    const 읽힌 = 조각.값기록.때.filter((t) => 이름표.some(([, n]) => 수(t.값[n])));
    if (읽힌.length === 0) continue;
    const 차 = 수(따.시작때) && 수(조각.값기록.시작때) ? (따.시작때 - 조각.값기록.시작때) / 1000 : 읽힌[0]!.초;
    const 앞초 = 수(따.시작초) ? 따.시작초 : 0;
    const 끝초 = 수(따.걸린초) ? 앞초 + 따.걸린초 : Infinity;
    for (const t of 읽힌) {
      const 초 = 둥(앞초 + t.초 - 차);
      if (초 < 앞초 - 0.5 || 초 > 끝초 + 0.5) continue;
      const 줄: 판값 = { 초 };
      for (const [k, n] of 이름표) {
        const v = t.값[n];
        if (!수(v)) continue;
        if (k !== '처치') {
          줄[k] = v;
          continue;
        }
        if (앞처치 !== null && v > 앞처치) 처치누적 += v - 앞처치;
        앞처치 = v;
        줄.처치 = 처치누적;
      }
      줄들.push(줄);
    }
  }
  return 줄들;
}

/** 시뮬 예상(2초마다 · 볼값 이름)을 같은 꼴로 */
export const 시뮬값들 = (r: Pick<시뮬결과, '예상'>, 연결: 모델['볼값연결']): 판값[] =>
  r.예상.map((x) => {
    const 줄: 판값 = { 초: x.초 };
    for (const k of 비교이름들) if (연결[k] !== undefined && 수(x.값[연결[k]!])) 줄[k] = x.값[연결[k]!]!;
    return 줄;
  });

const 행동글 = (x: 행동, 지금: number): string => `${x.행동}${x.대상 === undefined ? '' : ` ${x.대상}`}${x.자리 === undefined ? '' : ` (${x.자리[0]},${x.자리[1]})`}${x.자리들 === undefined ? '' : ` ${x.자리들.length}개`} ${x.됨 === false ? '안 됨' : '됨'} · ${둥(지금 - (x.끝초 ?? x.초))}초 전`;

/** 어긋남이 시작되기 전 마지막으로 맞던 때부터 어긋난 때까지 판에서 잰 것 — AI 가 짐작 대신 이 값으로 입력을 고친다 */
function 잰값글(이름: 비교이름 | '끝', 판: readonly 판값[], 시뮬: readonly 판값[], 행동들: readonly 행동[], 부터: number, 까지: number): string {
  const 판때 = (t: number): 판값 | undefined => [...판].reverse().find((x) => x.초 <= t + 0.01) ?? 판[0];
  const 시때 = (t: number): 판값 | undefined => 시뮬[Math.min(시뮬.length - 1, Math.max(0, Math.round(t / 예상간격초)))];
  const 사이 = 행동들.filter((x) => x.됨 !== false && (x.끝초 ?? x.초) > 부터 && (x.끝초 ?? x.초) <= 까지);
  const [a, b, c, d] = [판때(부터), 판때(까지), 시때(부터), 시때(까지)];
  if (이름 === '재화' || 이름 === '끝') {
    const 쓴 = 사이.reduce((s, x) => s + (x.값 ?? 0), 0);
    const 주운 = 사이.filter((x) => x.행동 === '줍기').reduce((s, x) => s + (x.자리들?.length ?? 1), 0);
    const 처치 = a?.처치 !== undefined && b?.처치 !== undefined ? ` · 처치 ${b.처치 - a.처치}` : '';
    const 들어온 = a?.재화 !== undefined && b?.재화 !== undefined ? b.재화 - a.재화 + 쓴 : null;
    return `${둥(부터)}~${둥(까지)}초 판: 재화 ${a?.재화 ?? '?'} → ${b?.재화 ?? '?'} · 쓴 재화 ${쓴} · 들어온 재화 ${들어온 ?? '?'} · 줍기 ${주운}개${처치} / 시뮬: 재화 ${c?.재화 ?? '?'} → ${d?.재화 ?? '?'}`;
  }
  return `${둥(부터)}~${둥(까지)}초 ${이름} 판 ${a?.[이름] ?? '?'} → ${b?.[이름] ?? '?'} · 시뮬 ${c?.[이름] ?? '?'} → ${d?.[이름] ?? '?'}`;
}

/**
 * 판과 재현을 같은 시각끼리 견준다. 값마다 허용 차이를 넘은 채 지속초 이상 이어진 첫 구간을 찾고, 가장 이른 것 하나를 짚는다.
 * 판은 아직 도는데 재현 시뮬이 먼저 끝났으면(지거나 이겨서) 그것도 어긋남이다(16104 둘째 맵 — 판 6웨이브 · 재현 3웨이브에서 짐)
 */
export function 재현비교하기(판: readonly 판값[], r: Pick<시뮬결과, '예상' | '이김'>, 연결: 모델['볼값연결'], 행동들: readonly 행동[], 지킬것최대: number): 재현비교 {
  const 시뮬 = 시뮬값들(r, 연결);
  const 시뮬끝 = 시뮬.at(-1)?.초 ?? 0;
  const 짝 = 판.filter((p) => p.초 <= 시뮬끝 + 예상간격초 / 2).map((p) => ({ p, s: 시뮬[Math.min(시뮬.length - 1, Math.round(p.초 / 예상간격초))]! }));
  const 후보: { 초: number; 이름: 비교이름 | '끝'; 판: number | null; 시뮬: number | null; 맞던때: number }[] = [];
  for (const 이름 of 비교이름들) {
    let 시작: (typeof 짝)[number] | null = null;
    let 맞던때 = 0;
    for (const x of 짝) {
      const [a, b] = [x.p[이름], x.s[이름]];
      if (a === undefined || b === undefined) continue;
      if (Math.abs(a - b) <= 허용(이름, a, b, 지킬것최대)) {
        [시작, 맞던때] = [null, x.p.초];
        continue;
      }
      시작 ??= x;
      if (x.p.초 - 시작.p.초 >= 지속초) {
        후보.push({ 초: 시작.p.초, 이름, 판: 시작.p[이름]!, 시뮬: 시작.s[이름]!, 맞던때 });
        break;
      }
    }
  }
  const 판끝 = 판.at(-1)?.초 ?? 0;
  if (판끝 > 시뮬끝 + 지속초) 후보.push({ 초: 시뮬끝, 이름: '끝', 판: null, 시뮬: null, 맞던때: 0 });
  const 첫 = 후보.sort((a, b) => a.초 - b.초)[0];
  const 표때 = new Set(짝.filter((x, i) => i === 0 || Math.floor(x.p.초 / 20) > Math.floor(짝[i - 1]!.p.초 / 20) || x.p.초 === 첫?.초).map((x) => x.p.초));
  const 표 = 짝.filter((x) => 표때.has(x.p.초)).map((x) => ({ 초: x.p.초, 판: x.p, 시뮬: x.s }));
  if (첫 === undefined) return { 맞음: true, 본수: 짝.length, 어긋남: null, 표 };
  const 앞 = [...행동들].reverse().find((x) => (x.끝초 ?? x.초) <= 첫.초);
  const 어: 어긋남 = {
    초: 첫.초,
    값: 첫.이름,
    판: 첫.판,
    시뮬: 첫.시뮬,
    앞행동: 앞 === undefined ? null : 행동글(앞, 첫.초),
    고칠곳: 고칠곳[첫.이름],
    잰값: 첫.이름 === '끝' ? `시뮬은 ${둥(시뮬끝)}초에 ${r.이김 ? '이겨' : '져'} 끝났는데 판은 ${둥(판끝)}초까지 돌았다` : 잰값글(첫.이름, 판, 시뮬, 행동들, 첫.맞던때, 첫.초),
  };
  return { 맞음: false, 본수: 짝.length, 어긋남: 어, 표 };
}

/** 한 줄 — 계산 출력 · 게이트 막음 글이 같이 쓴다 */
export const 어긋남글 = (a: 어긋남): string =>
  `${둥(a.초)}초 ${a.값 === '끝' ? '판 길이' : a.값}${a.값 === '끝' ? '' : `: 판 ${a.판} · 시뮬 ${a.시뮬}`}${a.앞행동 === null ? '' : ` (그 앞 행동 ${a.앞행동})`} — 판에서 잰 값: ${a.잰값} — 고칠 곳: ${a.고칠곳}`;

/** 사람이 읽는 표 — 20초마다 한 줄과 어긋난 때 */
export const 비교표글 = (c: 재현비교): string[] =>
  c.표.map((x) => `  ${String(둥(x.초)).padStart(6)}초 ${비교이름들.filter((k) => x.판[k] !== undefined || x.시뮬[k] !== undefined).map((k) => `${k} 판 ${x.판[k] ?? '-'} · 시뮬 ${x.시뮬[k] ?? '-'}`).join(' | ')}${c.어긋남?.초 === x.초 ? '  ← 처음 어긋남' : ''}`);
