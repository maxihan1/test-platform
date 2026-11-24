// 시나리오 case 부품의 빈 칸을 저장값 · 대상 서버 계정으로 채운다 — 실행 만들기와 시험 실행이 같이 쓴다 (SPEC 도메인/시나리오 §3.7 · 실행 §3.2)
// runStore.ts 가 300줄을 넘어 여기 뗐다

import type { ScenarioPart } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { PoolClient } from 'pg';

import { 저장값을채운다 } from '../execution/savedInput.js';

export type 케이스부품 = Extract<ScenarioPart, { kind: 'case' }>;

/**
 * case 부품의 조립에 없는 칸을 저장값으로, 그래도 빈 계정 칸은 그 실행 대상 서버 줄의 계정(`계정들`)으로 채운다 —
 * 단독 실행과 같은 규칙이다 (시나리오 §3.7 · 실행 §3.2).
 * 값 꽂기 칸은 「입력한 값」이라 저장값 · 계정으로 안 채운다 — 실제 값은 러너가 꽂고 bound 에 남는다 (게이트 1 ①).
 * 시험 실행도 같은 것을 부른다. 연결은 트랜잭션 것을 받는다 — 쥔 채 pool 에서 또 꺼내면 교착한다
 */
export async function 부품채우기(
  c: Pick<PoolClient, 'query'>,
  parts: ScenarioPart[],
  케이스들: Map<string, { param_schema: unknown; expected_schema: unknown }>,
  계정들: readonly 역할계정[] | ((tcId: string) => readonly 역할계정[]) = [],
): Promise<ScenarioPart[]> {
  const 케이스부품들 = parts.filter((p): p is 케이스부품 => p.kind === 'case');
  const 채움 = await 계정별로채운다(c, 케이스부품들, 케이스들, 계정들);
  return parts.map((p) => {
    if (p.kind !== 'case') return p;
    const 찬 = 채움[케이스부품들.indexOf(p)]!;
    const 꽂을칸 = new Set((p.links ?? []).flatMap((l) => (l.kind === 'bind' && !Object.hasOwn(p.params, l.param) ? [l.param] : [])));
    return { ...찬, params: Object.fromEntries(Object.entries(찬.params).filter(([k]) => !꽂을칸.has(k))) };
  });
}

// 애플리케이션마다 그 대상 서버 줄의 계정이 다르다 (결정 13). 같은 계정 목록을 쓰는 부품끼리 묶어 채우고 원래 차례로 돌려놓는다
async function 계정별로채운다(
  c: Pick<PoolClient, 'query'>,
  부품들: 케이스부품[],
  케이스들: Map<string, { param_schema: unknown; expected_schema: unknown }>,
  계정들: readonly 역할계정[] | ((tcId: string) => readonly 역할계정[]),
): Promise<케이스부품[]> {
  if (typeof 계정들 !== 'function') return 저장값을채운다(c, 부품들, 케이스들, 계정들);
  const 묶음 = new Map<readonly 역할계정[], number[]>();
  부품들.forEach((p, i) => {
    const 계정 = 계정들(p.tcId);
    묶음.set(계정, [...(묶음.get(계정) ?? []), i]);
  });
  const 결과 = [...부품들];
  for (const [계정, 자리들] of 묶음) {
    const 채운 = await 저장값을채운다(c, 자리들.map((i) => 부품들[i]!), 케이스들, 계정);
    자리들.forEach((자리, k) => { 결과[자리] = 채운[k]!; });
  }
  return 결과;
}
