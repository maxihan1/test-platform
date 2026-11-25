// 기기 성능의 테스트 프로시저 — 고른 케이스를 도는 단위(옛 꼴 케이스 하나 · 프로시저 하나)로 펼치고, 답을 구간 · 실행 로그 재료로 푼다 (도메인/성능 §3.9 「기기 성능」 「프로시저 안 케이스를 고르면 그 프로시저가 통째로 돈다」)
// deviceRun.ts 가 300줄에 닿아 뗐다

import type { ExecuteResponse, ProcId } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { PoolClient } from 'pg';

import { 저장값을채운다 } from '../execution/savedInput.js';

export interface 케이스재료 {
  tcId: string;
  filePath: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
}

/** 러너에 요청 하나로 가는 것 — 옛 꼴 케이스면 procId 가 없고 케이스가 하나다 */
export interface 도는단위 {
  procId: ProcId | null;
  케이스들: 케이스재료[];
}

interface 케이스행 {
  tc_id: string;
  file_path: string;
  param_schema: unknown;
  expected_schema: unknown;
  proc_id: string | null;
  proc_seq: number | null;
  is_active: boolean;
}

/**
 * 고른 차례에서 처음 나온 순서로 펼친다 — 프로시저 안 케이스는 그 프로시저의 활성 케이스 전부를 실행 차례대로 한 번만, 나머지는 하나씩.
 * 측정을 만든 뒤 프로시저에서 빠져 내려간 케이스(비활성 줄에 옛 번호가 남았다)는 같이 돌 수도 혼자 돌 수도 없어 빼고 `뺀` 으로 알린다 (실행 §3.2 「반영」과 같다).
 * 값은 고른 케이스든 같이 든 케이스든 저장값 → 코드 기본값이다
 */
export async function 단위로펼친다(
  client: Pick<PoolClient, 'query'>,
  caseIds: readonly string[],
  계정들: readonly 역할계정[],
): Promise<{ 단위들: 도는단위[]; 뺀: string[] }> {
  const r = await client.query<케이스행>(
    `SELECT tc_id, file_path, param_schema, expected_schema, proc_id, proc_seq, is_active FROM test_case
     WHERE tc_id = ANY($1::text[])
        OR (is_active AND proc_id IN (SELECT proc_id FROM test_case WHERE tc_id = ANY($1::text[]) AND is_active AND proc_id IS NOT NULL))`,
    [caseIds],
  );
  const 행 = new Map(r.rows.map((x) => [x.tc_id, x]));
  const 묶음: 케이스행[][] = [];
  const 넣은 = new Set<string>();
  const 뺀: string[] = [];
  for (const id of caseIds) {
    const x = 행.get(id);
    if (x === undefined) throw new Error(`케이스 ${id} 가 없어졌습니다`);
    if (x.proc_id !== null && !x.is_active) {
      뺀.push(id);
      continue;
    }
    if (x.proc_id === null) {
      묶음.push([x]);
      continue;
    }
    if (넣은.has(x.proc_id)) continue;
    넣은.add(x.proc_id);
    묶음.push(r.rows.filter((c) => c.proc_id === x.proc_id && c.is_active).sort((a, b) => (a.proc_seq ?? 0) - (b.proc_seq ?? 0)));
  }
  const 채움 = await 저장값을채운다(
    client,
    [...new Set(묶음.flat().map((x) => x.tc_id))].map((tcId) => ({ tcId, params: {} as Record<string, unknown>, expected: {} as Record<string, unknown> })),
    new Map(r.rows.map((x) => [x.tc_id, { param_schema: x.param_schema, expected_schema: x.expected_schema }])),
    계정들,
  );
  const 값 = new Map(채움.map((c) => [c.tcId, c]));
  const 단위들 = 묶음.map((u) => ({
    procId: u[0]!.proc_id,
    케이스들: u.map((x) => ({ tcId: x.tc_id, filePath: x.file_path, params: 값.get(x.tc_id)!.params, expected: 값.get(x.tc_id)!.expected })),
  }));
  return { 단위들, 뺀 };
}

/** 단위 한 번의 답을 푼 것 — 절차는 실행 차례대로, 케이스 판정은 요청 차례대로 */
export interface 단위답 {
  steps: { title: string; durationMs: number; tcId: string }[];
  끝들: { tcId: string; status: string; 까닭?: string; blockedBy?: string }[];
  // 케이스 판정에 안 실린 판정 밖 사유 — 판정이 다 난 뒤 프로세스가 실패로 끝났다
  오류?: string;
}

/**
 * 러너 답을 푼다 — 케이스 사이 준비 절차는 다음 케이스 몫이다(StepResult.tcId). 케이스 줄을 못 받은 러너는 같은 절차를 결과마다 실어 절차 번호로 하나만 남긴다.
 * 판정 밖 사유는 어느 케이스에도 안 실렸을 때만 따로 적는다 — 못 간 답 · 끊긴 프로시저는 남은 케이스에 이미 실렸다
 */
export function 답풀기(답: ExecuteResponse): 단위답 {
  const 오류 = 답.error?.message;
  // 못 간 답의 원문(주소 · 시간 초과)은 답 맨 위 사유의 stack 이다. 성능 로그에는 접힌 자리가 없어 한 줄에 같이 적는다
  const 원문 = 답.error?.stack === undefined ? '' : ` — ${답.error.stack}`;
  const 본 = new Set<number>();
  return {
    steps: 답.results
      .flatMap((r) => r.steps.map((x) => ({ seq: x.seq, title: x.title, durationMs: x.durationMs, tcId: x.tcId ?? r.tcId })))
      .filter((x) => !본.has(x.seq) && 본.add(x.seq) !== undefined)
      .sort((a, b) => a.seq - b.seq)
      .map(({ title, durationMs, tcId }) => ({ title, durationMs, tcId })),
    끝들: 답.results.map((r) => ({
      tcId: r.tcId,
      status: r.status,
      ...(r.error !== undefined && { 까닭: r.error.message === 오류 ? `${r.error.message}${원문}` : r.error.message }),
      ...(r.blockedBy !== undefined && { blockedBy: r.blockedBy }),
    })),
    ...(오류 !== undefined && !답.results.some((r) => r.error?.message === 오류) && { 오류 }),
  };
}

/** 실행 로그에 남길 경고 — 통과 케이스는 안 적는다. Blocked 는 까닭 대신 막은 케이스를 적는다 */
export function 알릴말(model: string, loop: number, 답: 단위답): string[] {
  const 머리 = `${model} ${loop}회차`;
  const 말 = 답.끝들.flatMap((k) => {
    if (k.status === 'PASS') return [];
    if (k.blockedBy !== undefined) return [`${머리} ${k.tcId} 는 선행 케이스 ${k.blockedBy} 가 통과하지 못해 실행하지 못했습니다`];
    return [`${머리} ${k.tcId} 가 ${k.status} 로 종료되었습니다${k.까닭 === undefined ? '' : ` — ${k.까닭}`}`];
  });
  return 답.오류 === undefined ? 말 : [...말, `${머리} 테스트 프로시저 실행 오류 — ${답.오류}`];
}
