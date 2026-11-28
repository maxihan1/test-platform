// 게임 전략 계산기 — 시뮬레이션 · 설치 자리 고르기. 피해 계산을 AI 가 머리로 하면 자주 틀려서 숫자는 이 스크립트가 낸다
// 쓰는 법: AI 가 입력 JSON 을 `<자료 폴더>/game-calc/<이름>.json` 에 쓰고 `npx tsx scripts/authoring-game-calc.ts <입력 파일>` — 숫자와 지도 CALC 줄 초안(JSON 한 줄)을 찍는다. 틀린 입력은 2 로 끝난다
// 웨이브 체력 합만 견주던 버티기 · 예산은 뺐다(2026-11-28) — 시간을 안 흘려 「버틴다」고 해 놓고 판은 1~2웨이브에서 졌다. 시뮬이 둘을 다 한다
import { readFileSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';

import { type 원, type 점, 원안길이, 입력읽기 } from '@platform/kit/gameplay';

import { 시뮬계산 } from './authoring-game-sim-run.js';

export { 원안길이, type 원, type 점 };

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 글없으면 = (v: unknown, 없을때: string): string => (글인가(v) ? v : 없을때);
const 점인가 = (v: unknown): v is 점 => Array.isArray(v) && v.length === 2 && v.every(수인가);
const 소수 = (n: number): number => Math.round(n * 100) / 100;

const 안인가 = (p: 점, 원: 원): boolean => Math.hypot(p[0] - 원.중심[0], p[1] - 원.중심[1]) <= 원.반지름;

export interface 계산결과 { 이름: string; 글: string; 줄글: string[]; 결과: Record<string, unknown>; 입력요약: Record<string, unknown> }
type 입력틀림 = { 틀림: string };

const 길읽기 = (v: unknown): 점[] | string => (Array.isArray(v) && v.length >= 2 && v.every(점인가) ? (v as 점[]) : '길 은 [[x, y], [x, y], …] 점 둘 이상이다');
const 목록 = (v: unknown, 이름: string): unknown[] | string => (Array.isArray(v) && v.length > 0 ? v : `${이름} 은 하나 이상 적은 목록이다`);

/** 입력 파일이 자료 폴더의 game-calc 아래에 있으면 그 자료 폴더 — 손 시간 · 격자 · 재현 기록을 거기서 읽는다 */
export const 자료폴더 = (파일: string): string | undefined => (basename(dirname(파일)) === 'game-calc' ? dirname(dirname(파일)) : undefined);

export function 시뮬(입력: Record<string, unknown>, 파일?: { 경로: string; 글: string }): 계산결과 | 입력틀림 {
  const m = 입력읽기(입력);
  if ('틀림' in m) return m;
  const 자료 = 파일 === undefined ? undefined : 자료폴더(파일.경로);
  const r = 시뮬계산(m, 자료, 파일?.글 ?? JSON.stringify(입력), 파일 === undefined ? '' : 자료 === undefined ? 파일.경로 : relative(자료, 파일.경로));
  return '틀림' in r ? r : { 이름: '시뮬', ...r };
}

export function 자리(입력: Record<string, unknown>): 계산결과 | 입력틀림 {
  const 길 = 길읽기(입력.길);
  const 후보들 = 목록(입력.후보, '후보');
  if (typeof 길 === 'string') return { 틀림: 길 };
  if (typeof 후보들 === 'string') return { 틀림: 후보들 };
  if (!수인가(입력.사거리) || 입력.사거리 <= 0) return { 틀림: '사거리 는 0 보다 큰 수다' };
  const 못 = Array.isArray(입력.못놓는곳) ? 입력.못놓는곳.map(객체) : [];
  if (못.some((m) => !점인가(m.중심) || !수인가(m.반지름))) return { 틀림: '못놓는곳 은 [{ 중심: [x, y], 반지름 }] 이다' };
  const 나옴 = [];
  const 뺌: string[] = [];
  for (const [i, c] of 후보들.entries()) {
    const x = 객체(c);
    if (!글인가(x.이름) || !점인가(x.자리)) return { 틀림: `후보 ${i + 1}번은 { 이름, 자리: [x, y] } 이다` };
    if (못.some((m) => 안인가(x.자리 as 점, { 중심: m.중심 as 점, 반지름: m.반지름 as number }))) 뺌.push(x.이름);
    else 나옴.push({ 이름: x.이름, 덮음: 소수(원안길이(길, { 중심: x.자리 as 점, 반지름: 입력.사거리 })) });
  }
  나옴.sort((a, b) => b.덮음 - a.덮음);
  const 전체 = 길.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - 길[i]![0], p[1] - 길[i]![1]), 0);
  if (전체 === 0) return { 틀림: '길 의 점들이 한 자리라 길이가 0 이다 — 서로 다른 점을 적는다' };
  return {
    이름: '자리',
    글: 나옴.length === 0 ? '놓을 수 있는 후보가 없다' : `덮는 길이 순서 ${나옴.map((x) => `${x.이름} ${x.덮음}`).join(' > ')}${뺌.length === 0 ? '' : ` (못 놓아 뺌 ${뺌.join(' · ')})`}`,
    줄글: [`길 전체 ${소수(전체)} · 사거리 ${입력.사거리}`, ...나옴.map((x) => `  ${x.이름} 덮음 ${x.덮음} (${소수((x.덮음 / 전체) * 100)}%)`), ...뺌.map((n) => `  ${n} 못 놓는 곳이라 뺌`)],
    결과: { 순서: 나옴, 뺌, 길전체: 소수(전체) },
    입력요약: { 사거리: 입력.사거리, 후보수: 후보들.length, 못놓는곳수: 못.length },
  };
}

const 계산들: Record<string, (입력: Record<string, unknown>, 파일?: { 경로: string; 글: string }) => 계산결과 | 입력틀림> = { 시뮬, 자리 };

export function 계산하기(입력: unknown, 파일이름: string, 파일?: { 경로: string; 글: string }): 계산결과 | 입력틀림 {
  const x = 객체(입력);
  const 풀이 = typeof x.계산 === 'string' ? 계산들[x.계산] : undefined;
  if (풀이 === undefined) return { 틀림: `계산 은 ${Object.keys(계산들).join(' · ')} 중 하나다${x.계산 === '버티기' || x.계산 === '예산' ? ' — 버티기 · 예산은 뺐다. 시간을 흘려 보는 시뮬 을 쓴다' : ''}` };
  const r = 풀이(x, 파일);
  return '틀림' in r ? r : { ...r, 이름: 글없으면(x.이름, 파일이름) };
}

/** 지도 CALC 줄 초안 — 계산 직후라 아직 짐작(GUESS)이다. 놀아 보고 예측이 맞으면 AI 가 확인으로 올린다 */
export function 줄초안(r: 계산결과, 입력: Record<string, unknown>): Record<string, unknown> {
  const 빌드데이터썼나 = 입력.빌드데이터 === true;
  const text = `${r.이름}: ${r.글}${빌드데이터썼나 ? ' (빌드 데이터 값 씀)' : ''}`.slice(0, 1000);
  return { kind: 'CALC', key: `calc:${r.이름}`, name: r.이름, learned: { text, belief: 'GUESS', data: { 입력: r.입력요약, 결과: r.결과, ...(글인가(입력.곳) ? { 곳: 입력.곳 } : {}), ...(빌드데이터썼나 ? { 출처: '빌드 데이터' } : {}) } } };
}

/**
 * 케이스의 작전 함수에 넣을 순서자료 — 시뮬 입력 그대로 · 고른 순서 · 버금 순서 · 잰 손. 이기는 안이 있는 시뮬 결과만 낸다.
 * 케이스는 정식 실행에서 kit `순서대로`(`@platform/kit/parts`)로 배울 때와 같은 방식으로 판을 한다(2026-11-28 사용자 「케이스도 같은 방식」)
 */
export function 순서자료(r: 계산결과, 입력: Record<string, unknown>): Record<string, unknown> | null {
  if (r.결과.계산 !== '시뮬' || r.결과.이김 !== true) return null;
  const { 재현: _재현, ...남은 } = 입력;
  const { 기록: _기록, ...손 } = 객체(r.결과.손);
  return { 입력: 남은, 정책: r.결과.정책, 버금: r.결과.버금, 손 };
}

function 실행(): void {
  const 인자 = process.argv.slice(2);
  const 케이스 = 인자.includes('--case');
  const 파일 = 인자.find((x) => x !== '--case');
  if (파일 === undefined) {
    process.stderr.write('쓰는 법: npx tsx scripts/authoring-game-calc.ts <입력 JSON 파일> [--case — 케이스 작전 함수에 넣을 순서자료만 찍는다]\n');
    process.exit(2);
  }
  let 입력: unknown;
  let 글 = '';
  try {
    글 = readFileSync(파일, 'utf8');
    입력 = JSON.parse(글);
  } catch (e) {
    process.stderr.write(`입력 파일을 못 읽었다(${파일}) — ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
  const r = 계산하기(입력, basename(파일).replace(/\.json$/, ''), { 경로: 파일, 글 });
  if ('틀림' in r) {
    process.stderr.write(`입력이 틀렸다 — ${r.틀림}\n`);
    process.exit(2);
  }
  if (케이스) {
    const 자료 = 순서자료(r, 객체(입력));
    if (자료 === null) {
      process.stderr.write(`순서자료를 못 낸다 — ${r.글}. 이기는 안이 있는 시뮬 입력에만 쓴다\n`);
      process.exit(2);
    }
    process.stdout.write(`${JSON.stringify(자료)}\n`);
    return;
  }
  process.stdout.write(`${r.줄글.join('\n')}\n결론: ${r.글}\n지도 CALC 줄 초안\n${JSON.stringify(줄초안(r, 객체(입력)))}\n`);
}

if (process.argv[1] !== undefined && /authoring-game-calc\.[tj]s$/.test(process.argv[1])) 실행();
