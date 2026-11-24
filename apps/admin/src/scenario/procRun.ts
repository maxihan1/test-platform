// E2E 프로시저 단계를 러너 요청 · 실행 기록으로 옮긴다 — 지금 프로시저의 케이스를 읽어 값을 채우고 결과를 칸마다 맞춘다 (SPEC 도메인/시나리오 §3.7 결정 17)
// 실행 만들기(runStore.ts)와 시험 실행(trial.ts)이 같이 쓴다. 정식 실행이 프로시저를 펼치는 본보기는 execution/runExec.ts 다

import type { ExecuteCase, ScenarioCaseResult, ScenarioPart } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { PoolClient } from 'pg';

import { 저장값을채운다 } from '../execution/savedInput.js';
import { 비밀글자들 } from '../execution/trial.js';

import type { 카탈로그 } from './validate.js';

/** 박제한 케이스 한 건 — 돌 때의 입력과 명세. 결과 칸(status 부터)은 러너 답을 저장할 때 채운다 */
export interface 박제케이스 {
  tcId: string;
  name: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  paramSchema: unknown;
  expectedSchema: unknown;
  precondition: string[];
  status?: ScenarioCaseResult['status'];
  durationMs?: number;
  error?: ScenarioCaseResult['error'];
  blockedBy?: string;
}

export interface 프로시저단계 {
  /** 고른 케이스 — 부품의 tcId */
  tcId: string;
  procId: string;
  procName: string;
  cases: 박제케이스[];
}

interface 케이스행 {
  tc_id: string;
  name: string;
  precondition: string[];
  param_schema: unknown;
  expected_schema: unknown;
  proc_id: string;
  proc_name: string | null;
}

/** 고른 케이스마다 그 프로시저의 활성 케이스 수 — 케이스 파일을 안 열고 60분 상한만 셀 때 쓴다(값 연결 제안). 옛 꼴 케이스는 안 든다 */
export async function 프로시저케이스수읽기(c: Pick<PoolClient, 'query'>, tcIds: readonly string[]): Promise<Map<string, number>> {
  const r = await c.query<{ tc_id: string; n: number }>(
    `SELECT x.tc_id, count(t.tc_id)::int AS n FROM test_case x JOIN test_case t ON t.proc_id = x.proc_id AND t.is_active
      WHERE x.tc_id = ANY($1::text[]) GROUP BY x.tc_id`,
    [[...tcIds]],
  );
  return new Map(r.rows.map((x) => [x.tc_id, x.n]));
}

/** 러너 요청에 싣는 케이스 목록 — 도는 차례, 고른 케이스는 부품의 값 */
export const 요청케이스들 = (단계: 프로시저단계): ExecuteCase[] => 단계.cases.map(({ tcId, params, expected }) => ({ tcId, params, expected }));

/**
 * 프로시저 안 케이스를 고른 case 부품마다 지금 그 프로시저의 활성 케이스(proc_seq 차례)를 읽어 박제한다 — 부품 자리(0부터) → 단계.
 * 고른 케이스 값은 부품의 params · expected(부품채우기가 채운 것)이고, 나머지 케이스는 조립 값 없이 저장값 → 대상 서버 줄의 계정 → 코드 기본값 차례다.
 * 고른 케이스가 그 프로시저에서 빠졌으면 `실패` 가 만든 오류를 던진다
 */
export async function 프로시저단계읽기(
  c: Pick<PoolClient, 'query'>,
  채운부품: ScenarioPart[],
  재료: 카탈로그,
  계정들: (tcId: string) => readonly 역할계정[],
  실패: (글: string) => Error,
): Promise<Map<number, 프로시저단계>> {
  const 단계들 = new Map<number, 프로시저단계>();
  const 대상 = 채운부품.flatMap((p, i) => {
    if (p.kind !== 'case') return [];
    const 번호 = 재료.get(p.tcId)?.proc?.procId;
    return 번호 === undefined ? [] : [{ i, p, 번호 }];
  });
  if (대상.length === 0) return 단계들;

  const 읽음 = await c.query<케이스행>(
    `SELECT tc_id, name, precondition, param_schema, expected_schema, proc_id, proc_name
       FROM test_case WHERE proc_id = ANY($1::text[]) AND is_active ORDER BY proc_id, proc_seq`,
    [[...new Set(대상.map((x) => x.번호))]],
  );
  for (const { i, p, 번호 } of 대상) {
    const 줄들 = 읽음.rows.filter((r) => r.proc_id === 번호);
    if (!줄들.some((r) => r.tc_id === p.tcId)) throw 실패(`${i + 1}번 단계: ${p.tcId} 는 ${번호} 프로시저에서 빠졌다`);
    const 명세 = new Map(줄들.map((r) => [r.tc_id, r]));
    const 나머지 = await 저장값을채운다(
      c,
      줄들.filter((r) => r.tc_id !== p.tcId).map((r) => ({ tcId: r.tc_id, params: {}, expected: {} })),
      명세,
      계정들(p.tcId),
    );
    const 값 = new Map(나머지.map((x) => [x.tcId, x]));
    단계들.set(i, {
      tcId: p.tcId,
      procId: 번호,
      procName: 줄들[0]!.proc_name ?? 번호,
      cases: 줄들.map((r) => {
        const x = r.tc_id === p.tcId ? p : 값.get(r.tc_id)!;
        return {
          tcId: r.tc_id,
          name: r.name,
          params: x.params,
          expected: x.expected,
          paramSchema: r.param_schema,
          expectedSchema: r.expected_schema,
          precondition: r.precondition,
        };
      }),
    });
  }
  return 단계들;
}

/** 박제한 케이스들의 비밀 글자 — 시험 실행이 보관소에 미리 줄 목록에 넣는다 */
export const 단계비밀 = (단계: 프로시저단계): string[] =>
  단계.cases.flatMap((x) => 비밀글자들({ paramSchema: x.paramSchema, expectedSchema: x.expectedSchema, params: x.params, expected: x.expected }));

/** 박제한 케이스 줄에 러너가 준 케이스 결과를 tcId 로 맞춰 채운다. 결과가 없는 줄은 결과 칸을 비워 둔다 */
export function 결과넣기(박제: 박제케이스[], 결과: ScenarioCaseResult[] | undefined): 박제케이스[] {
  const 맞춤 = new Map((결과 ?? []).map((r) => [r.tcId, r]));
  return 박제.map((x) => {
    const r = 맞춤.get(x.tcId);
    return r === undefined
      ? x
      : {
          ...x,
          status: r.status,
          durationMs: r.durationMs,
          ...(r.error !== undefined && { error: r.error }),
          ...(r.blockedBy !== undefined && { blockedBy: r.blockedBy }),
        };
  });
}

/** 결과 조회 · 시험 실행 결과가 싣는 케이스 줄 — 값 · 명세는 안 싣고, 결과가 없으면 status 없이 tcId · name 만 싣는다 */
export interface 케이스줄 {
  tcId: string;
  name: string;
  status?: ScenarioCaseResult['status'];
  durationMs?: number;
  error?: ScenarioCaseResult['error'];
  blockedBy?: string;
}

export function 케이스줄들(박제: 박제케이스[]): 케이스줄[] {
  return 박제.map((x) => ({
    tcId: x.tcId,
    name: x.name,
    ...(x.status !== undefined && { status: x.status }),
    ...(x.durationMs !== undefined && { durationMs: x.durationMs }),
    ...(x.error !== undefined && { error: x.error }),
    ...(x.blockedBy !== undefined && { blockedBy: x.blockedBy }),
  }));
}

/** 고른 케이스 번호 → 그 프로시저의 케이스 수 — 제한 시간 합이 프로시저 단계를 세는 재료 */
export const 단계케이스수 = (단계들: Map<number, 프로시저단계>): Map<string, number> =>
  new Map([...단계들.values()].map((x) => [x.tcId, x.cases.length]));
